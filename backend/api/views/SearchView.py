from typing import List, Dict

from qdrant_client import QdrantClient

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from ..response_serializers.SearchRequestSerializer import SearchRequestSerializer
from ..response_serializers.PaperSerializer import PaperResponseSerializer
from drf_spectacular.utils import extend_schema

import requests
import os

# Qdrant settings – create_collection.py ile uyumlu olmalı
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "qdrant_paper")

# OpenAlex settings
OPENALEX_BASE = "https://api.openalex.org/works"
MAILTO = "ceydasen40@gmail.com"

# Embedding fonksiyonun (backend/app/embeddings.py içinde)
from app.embeddings import build_query_embedding_from_seed_papers


def _qdrant_search_vector(
    client: QdrantClient,
    vector: List[float],
    limit: int,
    offset: int = 0,
    year_min: int | None = None,
    year_max: int | None = None,
):
    """
    Qdrant versiyonuna göre doğru search methodunu seçer.
    Year filtresi varsa payload'taki 'year' alanına range filter uygular.
    """
    must_filters = []
    if year_min is not None:
        must_filters.append({"key": "year", "range": {"gte": year_min}})
    if year_max is not None:
        must_filters.append({"key": "year", "range": {"lte": year_max}})

    query_filter = {"must": must_filters} if must_filters else None

    # Yeni API: query_points
    if hasattr(client, "query_points"):
        resp = client.query_points(
            collection_name=QDRANT_COLLECTION,
            query=vector,
            limit=limit,
            offset=offset,
            with_payload=True,
            query_filter=query_filter,
        )
        return getattr(resp, "points", resp)

    # search_points
    if hasattr(client, "search_points"):
        resp = client.search_points(
            collection_name=QDRANT_COLLECTION,
            vector=vector,
            limit=limit,
            offset=offset,
            with_payload=True,
            query_filter=query_filter,
        )
        return getattr(resp, "result", resp)

    # Eski API: search
    if hasattr(client, "search"):
        return client.search(
            collection_name=QDRANT_COLLECTION,
            query_vector=vector,
            limit=limit,
            offset=offset,
            with_payload=True,
            query_filter=query_filter,
        )

    raise RuntimeError("No compatible search method found in this qdrant-client version.")


def _semantic_search_openalex(
    abstracts: List[str],
    keywords: List[str],
    limit: int,
    offset: int,
    year_min: int | None,
    year_max: int | None,
) -> Dict[str, dict]:
    """
    1) abstracts + keywords → embedding
    2) Qdrant'ta en yakın vektörleri bul (point.id → numeric)
    3) point.id → 'W{point.id}' formatına çevir
    4) OpenAlex /works?filter=openalex:W1|W2|... ile metadata çek
    5) Qdrant skorları ile birlikte {WID: (score, work_json)} map'i döndür
    """
    # 1) Embedding üret
    q_vec = build_query_embedding_from_seed_papers(
        abstracts=abstracts,
        shared_keywords=keywords,
    )
    if q_vec is None:
        return {}

    # 2) Qdrant araması
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    points = _qdrant_search_vector(
        client=client,
        vector=q_vec.tolist(),
        limit=limit,
        offset=offset,
        year_min=year_min,
        year_max=year_max,
    )

    if not points:
        return {}

    # 3) Qdrant point.id → W{id}
    qdrant_scores: Dict[str, float] = {}
    wid_list: List[str] = []

    for p in points:
        raw_id = str(getattr(p, "id", "")).strip()
        if not raw_id:
            continue
        if raw_id.startswith("W"):
            wid = raw_id
        else:
            wid = f"W{raw_id}"   # 🔹 burada başına W ekliyoruz
        qdrant_scores[wid] = p.score
        wid_list.append(wid)

    if not wid_list:
        return {}

    uniq_ids = list(dict.fromkeys(wid_list))
    filter_value = "openalex:" + "|".join(uniq_ids)

    params = {
        "filter": filter_value,
        "per_page": len(uniq_ids),
        "mailto": MAILTO,
    }

    resp = requests.get(OPENALEX_BASE, params=params, timeout=20)
    resp.raise_for_status()
    payload = resp.json()
    results = payload.get("results", []) or []

    # OpenAlex çalışmaları kısa id ("W123...") → work_json map'i
    by_id: Dict[str, dict] = {}
    for w in results:
        full_id = w.get("id") or ""  # "https://openalex.org/W123..."
        if not full_id:
            continue
        short_id = full_id.rsplit("/", 1)[-1]  # "W123..."
        by_id[short_id] = w

    # Qdrant skorları ve OpenAlex work'lerini tek map'te birleştir
    combined: Dict[str, dict] = {}
    for wid, score in qdrant_scores.items():
        work = by_id.get(wid)
        if not work:
            continue
        combined[wid] = {
            "score": score,
            "work": work,
        }

    return combined


@extend_schema(
    request=SearchRequestSerializer,
    responses=PaperResponseSerializer(many=True),  # paginated wrapper in UI, items are Paper
    description="Search for similar papers using abstracts/keywords via Qdrant (semantic search) and hydrate with OpenAlex metadata."
)
class PaperSearchView(APIView):
    """
    POST /api/search/?page=N&per_page=M
    Body JSON: { "abstracts": [...], "keywords": [...], "year_min": 2020, "year_max": 2024 }

    Behavior:
      - Generate query embedding from abstracts + keywords
      - Query Qdrant for nearest neighbors (semantic search)
      - Convert Qdrant point.id → W{point.id}
      - Fetch those works from OpenAlex /works using filter=openalex:W1|W2|...
      - Map OpenAlex works to frontend format and attach Qdrant scores
      - Return { count, next, previous, results, query_summary }
    """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # 1) Validate request body
        s = SearchRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        abstracts = s.validated_data.get("abstracts", []) or []
        keywords = s.validated_data.get("keywords", []) or []
        year_min = s.validated_data.get("year_min")
        year_max = s.validated_data.get("year_max")

        if not abstracts and not keywords:
            return Response(
                {"detail": "At least one of 'abstracts' or 'keywords' must be provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2) Pagination (?page, ?per_page)
        try:
            page = int(request.query_params.get("page", 1))
        except ValueError:
            page = 1
        try:
            per_page = int(request.query_params.get("per_page", 12))
        except ValueError:
            per_page = 12

        page = max(1, page)
        per_page = max(1, min(per_page, 200))
        offset = (page - 1) * per_page

        # 3) Semantic search: Qdrant + OpenAlex
        try:
            combined = _semantic_search_openalex(
                abstracts=abstracts,
                keywords=keywords,
                limit=per_page,
                offset=offset,
                year_min=year_min,
                year_max=year_max,
            )
        except requests.RequestException as exc:
            return Response(
                {"detail": f"Upstream error contacting OpenAlex: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as exc:
            return Response(
                {"detail": f"Semantic search error: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not combined:
            ser = PaperResponseSerializer([], many=True)
            return Response({
                "count": 0,
                "next": None,
                "previous": None,
                "results": ser.data,
                "query_summary": {
                    "abstracts_count": len([a for a in abstracts if a.strip()]),
                    "keywords_count": len([k for k in keywords if k.strip()]),
                    "page": page,
                    "per_page": per_page,
                },
            })

        # 4) Combined map → ordered list (Qdrant skoruna göre)
        items = []
        for wid, obj in combined.items():
            work = obj["work"]
            score = obj["score"]
            item = self.to_item(work)   # mevcut yapıyı koru
            item["score"] = score       # sadece score alanını ekle
            items.append(item)

        # Skora göre sırala
        items.sort(key=lambda x: x.get("score", 0), reverse=True)

        # İstersen normalize edilmiş yüzde de doldur (en yüksek skora göre 0–100)
        if items:
            max_score = items[0].get("score") or 1.0
            for it in items:
                s_val = it.get("score") or 0.0
                it["relevance_pct"] = round((s_val / max_score) * 100, 1)

        ser = PaperResponseSerializer(items, many=True)
        return Response({
            "count": len(items),
            "next": None,      # Qdrant tarafında gerçek pagination ekleyene kadar None
            "previous": None,
            "results": ser.data,
            "query_summary": {
                "abstracts_count": len([a for a in abstracts if a.strip()]),
                "keywords_count": len([k for k in keywords if k.strip()]),
                "page": page,
                "per_page": per_page,
            },
        })

    # === Mapping helpers ===

    def to_item(self, w: dict) -> dict:
        """Maps an OpenAlex work object to the frontend-friendly format."""
        host_venue       = w.get("host_venue") or {}
        primary_location = w.get("primary_location") or {}
        primary_source   = primary_location.get("source") or {}
        open_access      = w.get("open_access") or {}
        best_oa_location = w.get("best_oa_location") or {}
        authorships      = w.get("authorships") or []

        # Authors
        authors = []
        for a in authorships:
            a_author = a.get("author") or {}
            name = a_author.get("display_name") or ""
            if name:
                authors.append(name)

        # Ensure short_id is valid before constructing the URL
        short_id = (w.get("id") or "").rsplit("/", 1)[-1]
        url = f"https://openalex.org/{short_id}" if short_id else ""

        # Abstract normalization
        abstract_field = w.get("abstract")
        if not abstract_field:
            inv = w.get("abstract_inverted_index")
            abstract_field = self.reconstruct_abstract(inv) if inv else ""

        # Concepts (cap to 10)
        concepts = []
        for c in (w.get("concepts") or [])[:10]:
            name = (c or {}).get("display_name")
            if name:
                concepts.append(name)

        cited_by_count   = w.get("cited_by_count", 0)
        references_count = len(w.get("referenced_works") or [])

        # id'yi kısa formda tut (W1234567)
        short_id = (w.get("id") or "").rsplit("/", 1)[-1]

        return {
            "id": short_id,
            "title": w.get("display_name") or "",
            "abstract": abstract_field,
            "url": url,
            "doi": (w.get("doi") or "").replace("https://doi.org/", ""),
            "venue": host_venue.get("display_name") or "",
            "year": w.get("publication_year"),
            "authors": authors,
            "authors_text": ", ".join(authors[:6]),
            "concepts": concepts,
            "tags": [],
            "relevance_pct": None,  # yukarıda skorla overwrite ediyoruz
            "cited_by_count": cited_by_count,
            "references_count": references_count,
            "is_open_access": bool(open_access.get("is_oa")),
            "oa_status": open_access.get("oa_status") or "",
            "oa_url": best_oa_location.get("url") or "",
            "created_at": w.get("created_date"),
        }

    def reconstruct_abstract(self, inv):
        """Turn OpenAlex abstract_inverted_index into a readable string."""
        if not isinstance(inv, dict):
            return inv or ""

        pairs = []
        for token, positions in inv.items():
            for p in positions:
                pairs.append((p, token))
        if not pairs:
            return ""
        pairs.sort(key=lambda x: x[0])
        return " ".join(word for _, word in pairs)
