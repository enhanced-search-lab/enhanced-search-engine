# qdrant-backend/scripts/index_domain_subset.py

import os
import json
import time
from typing import Dict, List, Set, Tuple
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

from qdrant_client import QdrantClient
from qdrant_client.models import (
    PointStruct,
    VectorParams,
    Distance,
    ProductQuantizationConfig,
)

# --- PYTHONPATH fix: scripts/ içinden "app" import edebilmek için ---
THIS_FILE = Path(__file__).resolve()
PROJECT_ROOT = None
for parent in THIS_FILE.parents:
    if (parent / "app").is_dir():
        PROJECT_ROOT = parent
        break

if PROJECT_ROOT is None:
    raise RuntimeError("Could not find project root containing 'app' folder")

import sys
sys.path.insert(0, str(PROJECT_ROOT))

from app.embeddings import build_final_embedding_for_work, EMBED_DIM  # type: ignore
from app.openalex_client import work_to_text_fields  # type: ignore

from domain_config import (
    DOMAIN_CONCEPT_IDS,
    YEAR_MIN,
    MIN_CITATIONS,
    GLOBAL_TARGET,
    PER_BUCKET_LIMIT,
    OPENALEX_MAILTO,
)

# Qdrant Cloud config (env'den)
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "qdrant_paper")

PER_PAGE = 200
STATE_FILE = THIS_FILE.parent / "domain_index_state.json"


def load_state() -> dict:
    if not STATE_FILE.exists():
        return {}
    with open(STATE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(state: dict) -> None:
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def get_qdrant_client() -> QdrantClient:
    return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


def get_existing_ids(client: QdrantClient) -> Set[int]:
    """
    Qdrant koleksiyonundaki tüm point ID'lerini set olarak döner.
    17k–200k arası için bu yaklaşım gayet yeterli.
    """
    existing_ids: Set[int] = set()
    offset = None

    while True:
        records, offset = client.scroll(
            collection_name=QDRANT_COLLECTION,
            limit=1000,
            offset=offset,
            with_payload=False,
            with_vectors=False,
        )
        for r in records:
            # Qdrant ID'leri genelde int, ama yine de güvenli tarafta kalalım
            existing_ids.add(int(r.id))

        if offset is None:
            break

    print(f"🔎 Qdrant koleksiyonunda zaten {len(existing_ids)} point var.")
    return existing_ids



def recreate_collection(client: QdrantClient) -> None:
    """
    Koleksiyonu temizleyip yeniden oluşturur.
    İlk büyük indekslemede 1 kere çalıştırman yeter.
    """
    client.recreate_collection(
        collection_name=QDRANT_COLLECTION,
        vectors_config=VectorParams(
            size=EMBED_DIM,
            distance=Distance.COSINE,
        ),
        quantization_config={
            "product": ProductQuantizationConfig(
                compression="x16",
                always_ram=True,
            )
        },
    )
    print(f"✅ Collection '{QDRANT_COLLECTION}' recreated on {QDRANT_URL}")


def build_openalex_filter(concept_id: str) -> str:
    """
    Tek bir concept id için OpenAlex filter string'i üretir.

    Burada:
    - publication_year:>1999  → 2000 ve sonrası
    - cited_by_count:>X       → X'ten fazla atıf
    """
    # Eğer C ile başlamıyorsa başına C ekle
    if not concept_id.startswith("C"):
        concept_id = f"C{concept_id}"

    filters = [
        "language:en",
        f"publication_year:>{YEAR_MIN - 1}",      # 2000 ve sonrası için  >1999
        f"cited_by_count:>{MIN_CITATIONS}",       # min citation filtresi
        f"concepts.id:{concept_id}",              # domain concept
    ]
    return ",".join(filters)


def fetch_works_page(filter_str: str, cursor: str = "*") -> Tuple[List[dict], str | None]:
    import requests

    url = "https://api.openalex.org/works"
    params = {
        "filter": filter_str,
        "per_page": PER_PAGE,
        "cursor": cursor,
        "sort": "cited_by_count:desc",
        "mailto": OPENALEX_MAILTO,
    }
    resp = requests.get(url, params=params, timeout=60)
    if resp.status_code != 200:
        print("Status:", resp.status_code)
        print("URL :", resp.url)
        print("Body:", resp.text[:1000])  # ilk 1000 char yeter
        resp.raise_for_status()

    resp.raise_for_status()
    data = resp.json()
    results = data.get("results", [])
    next_cursor = data.get("meta", {}).get("next_cursor")
    return results, next_cursor


def work_id_to_int(work_id: str) -> int:
    """
    'https://openalex.org/W3038568908' veya 'W3038568908' -> 3038568908
    """
    wid = work_id.strip()
    if wid.startswith("http"):
        wid = wid.rsplit("/", 1)[-1]
    if wid.startswith("W"):
        wid = wid[1:]
    return int(wid)


def main() -> None:
    # 0) Qdrant client
    client = get_qdrant_client()

    # 1) Qdrant'ta HALİHAZIRDA var olan ID'leri çek
    existing_ids = get_existing_ids(client)

    # 2) State yükle
    state = load_state()
    seen_ids: Set[int] = set(state.get("seen_ids", []))

    # 3) Tüm bildiğimiz ID'ler = Qdrant'tan gelenler + state'ten gelenler
    known_ids: Set[int] = existing_ids | seen_ids

    per_bucket_counts: Dict[str, int] = state.get("per_bucket_counts", {})
    total_indexed: int = state.get("total_indexed", 0)

    # ❌ Koleksiyonu sıfırlama kısmını kullanmıyoruz (17200'ü korumak için)
    # if not state.get("collection_created", False):
    #     recreate_collection(client)
    #     state["collection_created"] = True
    #     save_state(state)

    for bucket_name, concept_ids in DOMAIN_CONCEPT_IDS.items():
        per_bucket_counts.setdefault(bucket_name, 0)

        if per_bucket_counts[bucket_name] >= PER_BUCKET_LIMIT:
            print(f"Bucket {bucket_name} zaten limitte, atlanıyor.")
            continue

        for concept_id in concept_ids:
            cursor_key = f"{bucket_name}:{concept_id}"
            cursor = state.get("cursors", {}).get(cursor_key, "*")
            filter_str = build_openalex_filter(concept_id)

            while cursor is not None:
                if total_indexed >= GLOBAL_TARGET:
                    print("GLOBAL_TARGET'e ulaşıldı, çıkılıyor.")
                    # 🔁 Artık seen_ids değil known_ids kaydediyoruz
                    state["seen_ids"] = list(known_ids)
                    state["per_bucket_counts"] = per_bucket_counts
                    state["total_indexed"] = total_indexed
                    cursors = state.get("cursors", {})
                    cursors[cursor_key] = cursor
                    state["cursors"] = cursors
                    save_state(state)
                    return

                if per_bucket_counts[bucket_name] >= PER_BUCKET_LIMIT:
                    print(f"{bucket_name} için PER_BUCKET_LIMIT doldu.")
                    break

                print(
                    f"[{bucket_name}] concept={concept_id}, cursor={cursor}, "
                    f"bucket_count={per_bucket_counts[bucket_name]}, total={total_indexed}"
                )

                works, next_cursor = fetch_works_page(filter_str, cursor=cursor)
                if not works:
                    print("Bu concept için work kalmadı.")
                    break

                points: List[PointStruct] = []

                for w in works:
                    (
                        work_openalex_id,
                        title,
                        abstract_text,
                        topics_text,
                        concepts_text,
                    ) = work_to_text_fields(w)

                    internal_id = work_id_to_int(work_openalex_id)

                    # ✅ Artık Qdrant'ta OLANLARI da skip ediyoruz
                    if internal_id in known_ids:
                        continue

                    v = build_final_embedding_for_work(
                        title=title,
                        abstract=abstract_text,
                        topics_text=topics_text,
                        concepts_text=concepts_text,
                    )
                    if v is None:
                        continue

                    year = w.get("publication_year")
                    concepts_names = [
                        c.get("display_name")
                        for c in w.get("concepts", [])
                        if c.get("display_name")
                    ]
                    host_venue = w.get("host_venue", {}).get("display_name")
                    cited_by_count = w.get("cited_by_count")

                    points.append(
                        PointStruct(
                            id=internal_id,
                            vector=v.tolist(),
                            payload={
                                "openalex_id": work_openalex_id,
                                "year": year,
                                "domain_bucket": bucket_name,
                                # "concepts": concepts_names,
                                # "host_venue": host_venue,
                                # "cited_by_count": cited_by_count,
                            },
                        )
                    )

                    # 🔁 Hem run içinde hem state'te artık known_ids'i büyütüyoruz
                    known_ids.add(internal_id)
                    seen_ids.add(internal_id)
                    per_bucket_counts[bucket_name] += 1
                    total_indexed += 1

                    if (
                        per_bucket_counts[bucket_name] >= PER_BUCKET_LIMIT
                        or total_indexed >= GLOBAL_TARGET
                    ):
                        break

                if points:
                    client.upsert(
                        collection_name=QDRANT_COLLECTION,
                        points=points,
                    )
                    print(
                        f"✅ {len(points)} point upsert edildi "
                        f"(bucket={bucket_name}, bucket_count={per_bucket_counts[bucket_name]}, "
                        f"total={total_indexed})"
                    )
                else:
                    print("Bu sayfada upsert edilecek point yok.")

                cursor = next_cursor
                time.sleep(1.0)

            # Bucket+concept için son cursor'u kaydet
            cursors = state.get("cursors", {})
            cursors[cursor_key] = cursor
            state["cursors"] = cursors
            state["seen_ids"] = list(known_ids)
            state["per_bucket_counts"] = per_bucket_counts
            state["total_indexed"] = total_indexed
            save_state(state)

    print("🎉 Domain indexing tamamlandı.")
    # Son kayıtta da known_ids'i yazalım
    state["seen_ids"] = list(known_ids)
    state["per_bucket_counts"] = per_bucket_counts
    state["total_indexed"] = total_indexed
    save_state(state)



if __name__ == "__main__":
    main()
