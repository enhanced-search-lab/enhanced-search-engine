import os
import sys
from pathlib import Path
from typing import List, Tuple, Dict
import collections
import re
import random

from dotenv import load_dotenv
load_dotenv()

import numpy as np
import requests

# ====================== PYTHON PATH FIX ============================
# So we can import app.* when running from scripts/
THIS_FILE = Path(__file__).resolve()
PROJECT_ROOT = None

for parent in THIS_FILE.parents:
    if (parent / "app").is_dir():
        PROJECT_ROOT = parent
        break

if PROJECT_ROOT is None:
    raise RuntimeError("Could not find 'app' folder for imports.")

sys.path.insert(0, str(PROJECT_ROOT))
# ==================================================================

from app.embeddings import build_final_embedding_for_work, EMBED_DIM
from app.openalex_client import work_to_text_fields  # existing helper

# ====================== OPENALEX CONFIG ============================

BASE_URL = "https://api.openalex.org/works"
MAILTO = os.environ.get("OPENALEX_MAILTO", "ceydasen40@gmail.com")

# ====================== GEMINI CONFIG ==============================

# Gemini client uses GEMINI_API_KEY (or GOOGLE_API_KEY) from env.
GEMINI_MODEL = os.environ.get("GEMINI_LLM_MODEL", "gemini-2.5-flash")

_gemini_client = None


def get_gemini_client():
    """
    Create (or reuse) a global Gemini client.
    The client reads GEMINI_API_KEY from environment.
    """
    global _gemini_client
    if _gemini_client is not None:
        return _gemini_client

    try:
        from google import genai  # type: ignore
    except ImportError as e:
        raise RuntimeError(
            "The 'google-genai' package is not installed. "
            "Install it with 'pip install google-genai'."
        ) from e

    try:
        # Client automatically picks up GEMINI_API_KEY
        _gemini_client = genai.Client()
    except Exception as e:
        raise RuntimeError(f"Could not initialize Gemini client: {e}")

    return _gemini_client


# ====================== STOPWORDS & HEURISTIC ======================

STOPWORDS = {
    "the", "and", "or", "of", "in", "on", "for", "to", "a", "an",
    "is", "are", "was", "were", "be", "by", "this", "that", "with",
    "we", "they", "it", "as", "at", "from", "into", "using", "our",
    "can", "will", "these", "those", "such", "their", "also", "have",
    "has", "had", "between", "within", "over", "under", "than", "then",
    "based", "use", "used", "paper", "study", "system",
    "systems", "method", "methods", "results", "show", "shows"
}


def abstract_to_openalex_query_heuristic(abstract: str, max_terms: int = 3) -> str:
    """
    Fallback: Turn a long abstract into a VERY SHORT keyword-style query for OpenAlex.
    Keep only a few frequent, informative tokens.
    """
    text = abstract.lower()
    tokens = re.findall(r"[a-zA-Z]+", text)

    freqs = collections.Counter()
    first_pos = {}

    for idx, tok in enumerate(tokens):
        if len(tok) <= 3:
            continue
        if tok in STOPWORDS:
            continue
        if tok not in first_pos:
            first_pos[tok] = idx
        freqs[tok] += 1

    if not freqs:
        # Fallback: just take the first ~200 chars of the abstract
        return abstract[:200]

    sorted_tokens = sorted(
        freqs.keys(),
        key=lambda t: (-freqs[t], first_pos[t])
    )

    selected = sorted_tokens[:max_terms]
    return " ".join(selected)


# ====================== LLM-BASED KEYWORDS =========================


def abstract_to_openalex_query_gemini(abstract: str, max_terms: int = 3) -> str:
    """
    Use Gemini to extract up to `max_terms` core technical keywords / short phrases
    from the abstract, for OpenAlex search.

    If something goes wrong, falls back to the heuristic keyword extraction.
    """
    try:
        client = get_gemini_client()
    except Exception as e:
        print(f"[Gemini] Could not initialize client: {e}")
        print("[Gemini] Falling back to heuristic keyword extraction.\n")
        return abstract_to_openalex_query_heuristic(abstract, max_terms=max_terms)

    prompt = f"""
You will receive a research paper abstract.

Your task:
- Extract {max_terms} core technical keywords or short noun phrases (1–3 words each)
  that best represent the main topic and domain.
- The result MUST be a single line, with the keywords separated by spaces.
- Do NOT add explanations, bullet points, numbering, or newlines.
- Prefer generic but domain-specific terms (e.g., "molecular communication", "nanonetworks")
  instead of very long phrases.

Abstract:
{abstract}
    """.strip()

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )
    except Exception as e:
        print(f"[Gemini] Error while calling API: {e}")
        print("[Gemini] Falling back to heuristic keyword extraction.\n")
        return abstract_to_openalex_query_heuristic(abstract, max_terms=max_terms)

    raw = (getattr(response, "text", None) or "").strip()

    if not raw:
        print("[Gemini] Empty response, falling back to heuristic.\n")
        return abstract_to_openalex_query_heuristic(abstract, max_terms=max_terms)

    first_line = raw.splitlines()[0]
    # allow commas but treat them as separators
    first_line = first_line.replace(",", " ")

    tokens = first_line.split()
    if not tokens:
        print("[Gemini] No tokens parsed, falling back to heuristic.\n")
        return abstract_to_openalex_query_heuristic(abstract, max_terms=max_terms)

    # Limit to max_terms tokens
    if len(tokens) > max_terms:
        tokens = tokens[:max_terms]

    query = " ".join(tokens)
    return query


# ====================== OPENALEX FETCH + EMBEDDINGS =================

def fetch_openalex_candidates(query: str, per_page: int = 30) -> List[dict]:
    """
    Call OpenAlex with a very short keyword query (search=...) and some filters.
    We only fetch a single page: top `per_page` results in OpenAlex's ranking.
    """
    params = {
        "search": query,
        "filter": "language:en,has_abstract:true",
        "per_page": per_page,
        "sort": "relevance_score:desc",
        "mailto": MAILTO,
    }
    resp = requests.get(BASE_URL, params=params, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    results = data.get("results", [])
    return results


def embed_query_from_abstract(abstract_text: str) -> np.ndarray:
    """
    Build an embedding for the query using the FULL abstract.
    We feed it as the 'abstract' field to our embedding builder.
    """
    v = build_final_embedding_for_work(
        title="",
        abstract=abstract_text,
        topics_text=None,
        concepts_text=None,
    )
    if v is None:
        raise RuntimeError("Failed to build embedding for query abstract.")
    v = np.asarray(v, dtype="float32")
    return v / (np.linalg.norm(v) + 1e-8)


def embed_work(work: dict) -> Tuple[str, str, np.ndarray]:
    """
    Build an embedding for a single OpenAlex work.
    Returns (work_id, title, vector).
    """
    work_id, title, abstract_text, topics_text, concepts_text = work_to_text_fields(work)

    v = build_final_embedding_for_work(
        title=title,
        abstract=abstract_text,
        topics_text=topics_text or None,
        concepts_text=concepts_text or None,
    )
    if v is None:
        raise RuntimeError(f"Embedding is None for OpenAlex work {work_id}")

    v = np.asarray(v, dtype="float32")
    v = v / (np.linalg.norm(v) + 1e-8)
    return work_id, title, v


# ===================== PROGRESSIVE RELAXATION ========================

def fetch_with_progressive_relaxation(tokens: List[str], per_page: int = 30, min_terms: int = 1) -> Tuple[List[dict], str]:
    """
    Verilen token listesinden:
      - önce hepsini kullanarak OpenAlex'ten sonuç çekmeye çalışır,
      - sonuç yoksa rastgele bir token siler, tekrar dener,
      - bu işlemi token sayısı min_terms'e inene kadar devam ettirir.

    En son kullanılan query string'i de geri döner.
    """
    # Dışarıdakini bozmamak için kopya al
    current_tokens = list(tokens)

    while len(current_tokens) >= min_terms:
        query = " ".join(current_tokens)
        print(f"   Trying query: \"{query}\"")

        works = fetch_openalex_candidates(query, per_page=per_page)
        print(f"   -> Fetched {len(works)} works.\n")

        if works:
            return works, query

        if len(current_tokens) == min_terms:
            # Daha fazla silemeyiz, çık
            break

        # Rastgele bir pozisyondan token sil
        drop_idx = random.randrange(len(current_tokens))
        dropped = current_tokens.pop(drop_idx)
        print(f"   No results, dropping random token: '{dropped}' (remaining: {current_tokens})")

    # Hiç sonuç bulunamadı
    return [], " ".join(current_tokens)







# =========================== MAIN PIPELINE ==========================

def main() -> None:
    # Usage: python scripts/rerank_openalex_from_abstracts.py "abstract 1" "abstract 2" ...
    if len(sys.argv) < 2:
        print("Usage: python scripts/rerank_openalex_from_abstracts.py \"abstract 1\" \"abstract 2\" ...")
        sys.exit(1)

    abstracts = sys.argv[1:]
    max_terms = 3

    print(f"\nReceived {len(abstracts)} abstracts.\n")

    # 1) Her abstract için 2–3 keyword çıkar (Gemini + fallback)
    all_keyword_lists: List[List[str]] = []

    for idx, abs_text in enumerate(abstracts, start=1):
        print(f"=== ABSTRACT {idx} (first 300 chars) ===")
        print(abs_text[:300] + ("..." if len(abs_text) > 300 else ""))
        print()

        openalex_query = abstract_to_openalex_query_gemini(abs_text, max_terms=max_terms)
        tokens = openalex_query.split()

        # En fazla max_terms kadarını al
        if len(tokens) > max_terms:
            tokens = tokens[:max_terms]

        print(f"→ Keywords for abstract {idx}: {tokens}\n")

        all_keyword_lists.append(tokens)

    if not all_keyword_lists:
        print("No abstracts / keywords found, aborting.")
        return

    # 2) Pozisyona göre grupla:
    #    1. keyword'ler bir grup, 2.'ler başka grup, 3.'ler başka...
    num_positions = max(len(kws) for kws in all_keyword_lists)
    print(f"Max keyword positions across abstracts: {num_positions}\n")

    all_works_by_id: Dict[str, dict] = {}

    
    for pos in range(num_positions):
        # Bu pozisyondaki keyword'leri tüm abstract'lardan topla
        group_tokens: List[str] = []
        for kws in all_keyword_lists:
            if len(kws) > pos:
                group_tokens.append(kws[pos])

        if not group_tokens:
            continue

        print(f"=== Position {pos+1} initial tokens ===")
        print(f"Tokens: {group_tokens}\n")

        # 1) Progressive relaxation ile sonuç çekmeye çalış
        works, final_query = fetch_with_progressive_relaxation(
            tokens=group_tokens,
            per_page=30,
            min_terms=1,   # istersen 2 yapıp tek kelimeye kadar düşmesini engelleyebilirsin
        )

        print(f"Final query used at position {pos+1}: \"{final_query}\"")
        print(f"Total works collected for this position: {len(works)}\n")

        # 2) Bu pozisyon için bulunan tüm makaleleri ID'ye göre dedup et
        for w in works:
            wid = w.get("id")
            if not wid:
                continue
            all_works_by_id[wid] = w


    print(f"Total unique candidate works collected: {len(all_works_by_id)}\n")

    if not all_works_by_id:
        print("No candidates collected from OpenAlex. Try different abstracts or relax filters.")
        return

        # 4) Her abstract için AYRI query embedding çıkar
    query_vecs: List[np.ndarray] = []
    for abs_text in abstracts:
        q_vec = embed_query_from_abstract(abs_text)
        query_vecs.append(q_vec)

    # 5) Tüm candidate makaleleri re-rank et:
    #    Her paper için, tüm query embedding'leriyle similarity hesapla,
    #    hem tek tek sakla hem de toplamını al.
    #    (total_sim, [sim1, sim2, ...], openalex_id, title)
    scored: List[Tuple[float, List[float], str, str]] = []

    for w in all_works_by_id.values():
        try:
            wid, title, v = embed_work(w)
        except RuntimeError as e:
            print(f"Skipping a work due to embedding error: {e}")
            continue

        # Her query embedding'iyle ayrı ayrı similarity
        sims = [float(np.dot(q_vec, v)) for q_vec in query_vecs]
        total_sim = sum(sims)

        scored.append((total_sim, sims, wid, title))

    if not scored:
        print("No valid embeddings produced for works.")
        return

    # Toplam similarity'ye göre sırala
    scored.sort(key=lambda x: x[0], reverse=True)

    # 6) 30x3 ≈ 90 senaryosu için top 90'ı al ve detaylı yazdır
    TOP_K = 90
    print(f"=== Re-ranked results by our embedding (top {TOP_K}) ===")
    for rank, (total, sims, wid, title) in enumerate(scored[:TOP_K], start=1):
        # oranları (yüzde katkıyı) da hesaplayalım
        if total > 0:
            contribs = [s / total for s in sims]
        else:
            contribs = [0.0 for _ in sims]

        # sims ve oranları okunaklı string'e çevir
        sims_str = ", ".join(f"{s:.3f}" for s in sims)
        contribs_str = ", ".join(f"{c*100:.1f}%" for c in contribs)

        print(
            f"{rank:2d}. total={total:.3f} | "
            f"sims=[{sims_str}] | "
            f"contrib=[{contribs_str}] | "
            f"{wid} | {title}"
        )


    


if __name__ == "__main__":
    main()
