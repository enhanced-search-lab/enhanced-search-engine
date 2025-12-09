import os
import sys
from pathlib import Path
from typing import List, Tuple
import collections
import re

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

from app.embeddings import build_final_embedding_for_work
from app.openalex_client import work_to_text_fields  # existing helper

# ====================== OPENALEX CONFIG ============================

BASE_URL = "https://api.openalex.org/works"
MAILTO = os.environ.get("OPENALEX_MAILTO", "ceydasen40@gmail.com")

# ====================== GEMINI CONFIG ==============================

# Gemini client uses GEMINI_API_KEY (or GOOGLE_API_KEY) from env. :contentReference[oaicite:4]{index=4}
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
    "based", "using", "use", "used", "paper", "study", "system",
    "systems", "method", "methods", "results", "show", "shows"
}


def abstract_to_openalex_query_heuristic(abstract: str, max_terms: int = 3) -> str:
    """
    Fallback: Turn a long abstract into a VERY SHORT keyword-style query for OpenAlex.
    We keep only 2-3 high-level, frequent tokens:
      - remove stopwords and very short tokens
      - count token frequency
      - pick the most frequent ones (ties broken by first appearance order)
    Result example: "molecular communication nanonetworks"
    """
    text = abstract.lower()
    # keep only alphabetical tokens (no numbers, no hyphens)
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

    # Sort tokens: highest frequency first, then earlier appearance
    sorted_tokens = sorted(
        freqs.keys(),
        key=lambda t: (-freqs[t], first_pos[t])
    )

    selected = sorted_tokens[:max_terms]
    return " ".join(selected)


# ====================== LLM-BASED KEYWORDS =========================


def abstract_to_openalex_query_gemini(abstract: str, max_terms: int = 3) -> str:
    """
    Use Gemini to extract 2–3 core technical keywords / short phrases
    from the abstract, for OpenAlex search.

    If something goes wrong (no API key, quota, etc.), we fall back
    to the heuristic keyword extraction.
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
    first_line = first_line.replace(",", " ")

    tokens = first_line.split()
    if not tokens:
        print("[Gemini] No tokens parsed, falling back to heuristic.\n")
        return abstract_to_openalex_query_heuristic(abstract, max_terms=max_terms)

    if len(tokens) > max_terms:
        tokens = tokens[:max_terms]

    query = " ".join(tokens)
    return query


# ====================== OPENALEX FETCH + EMBEDDINGS =================

def fetch_openalex_candidates(query: str, per_page: int = 30) -> List[dict]:
    """
    Call OpenAlex with a very short keyword query (search=...) and some filters.
    We only fetch a single page: top `per_page` results in OpenAlex's own ranking.
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


# =========================== MAIN PIPELINE ==========================

def main() -> None:
    # Read full abstract from command line
    if len(sys.argv) < 2:
        print("Usage: python scripts/rerank_openalex_from_abstract.py \"full abstract text here\"")
        sys.exit(1)

    full_abstract = sys.argv[1]

    print("\n=== FULL ABSTRACT (used for our embedding) ===")
    print(full_abstract[:400] + ("..." if len(full_abstract) > 400 else ""))
    print()

    # 1) Build a VERY SHORT keyword query (2-3 tokens) for OpenAlex using LLM
    openalex_query = abstract_to_openalex_query_gemini(full_abstract, max_terms=3)
    print("=== Derived OpenAlex keyword query (LLM, 2-3 tokens) ===")
    print(openalex_query)
    print()

    # 2) Fetch candidate works from OpenAlex
    works = fetch_openalex_candidates(openalex_query, per_page=30)
    print(f"Fetched {len(works)} works from OpenAlex.\n")

    if not works:
        print("No results from OpenAlex. Try another abstract or relax filters.")
        return

    print("=== OpenAlex original order (top 10) ===")
    for i, w in enumerate(works[:10], start=1):
        print(f"{i:2d}. {w.get('id', '')} | {w.get('display_name', '')}")
    print()

    # 3) Build query embedding from FULL abstract
    q_vec = embed_query_from_abstract(full_abstract)

    # 4) Build embeddings for all works and compute cosine similarities
    scored = []  # list of (similarity, openalex_id, title)

    for w in works:
        try:
            wid, title, v = embed_work(w)
        except RuntimeError as e:
            print(f"Skipping a work due to embedding error: {e}")
            continue

        sim = float(np.dot(q_vec, v))
        scored.append((sim, wid, title))

    if not scored:
        print("No valid embeddings produced for works.")
        return

    scored.sort(key=lambda x: x[0], reverse=True)

    print("=== Re-ranked results by our embedding (top 10) ===")
    for rank, (sim, wid, title) in enumerate(scored[:10], start=1):
        print(f"{rank:2d}. sim={sim:.3f} | {wid} | {title}")


if __name__ == "__main__":
    main()
