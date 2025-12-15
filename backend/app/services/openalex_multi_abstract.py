# app/services/openalex_multi_abstract.py

from __future__ import annotations

import os
import re
import random
import collections
from typing import List, Dict, Tuple

import numpy as np
import requests
from dotenv import load_dotenv

from app.embeddings import build_final_embedding_for_work
from app.openalex_client import work_to_text_fields

load_dotenv()

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
    Fallback: Uzun abstract'tan birkaç bilgilendirici kelime seçip
    kısa bir keyword query'ye çevirir.
    """
    text = abstract.lower()
    tokens = re.findall(r"[a-zA-Z]+", text)

    freqs = collections.Counter()
    first_pos: Dict[str, int] = {}

    for idx, tok in enumerate(tokens):
        if len(tok) <= 3:
            continue
        if tok in STOPWORDS:
            continue
        if tok not in first_pos:
            first_pos[tok] = idx
        freqs[tok] += 1

    if not freqs:
        # Fallback: abstract'ın ilk 200 karakteri
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
    Gemini ile abstract'tan en fazla max_terms tane teknik keyword/phrase çıkarır.

    ÇIKIŞ FORMAT PROTOKOLÜ:
    - Tek satır
    - Phrase'ler ';' ile ayrılmış:
        molecular communication; nanonetworks; quorum sensing
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
- The result MUST be a single line.
- Phrases MUST be separated by semicolons `;`.
- Do NOT add explanations, bullet points, numbering, or newlines.
- Example output:
  molecular communication; nanonetworks; quorum sensing

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

    return raw


# ====================== OPENALEX FETCH + EMBEDDINGS =================


def fetch_openalex_candidates(query: str, per_page: int = 30, from_publication_date: str | None = None, to_publication_date: str | None = None) -> List[dict]:
    """
    Verilen kısa query için OpenAlex'ten sonuç çeker.
    """
    # Build filter string, optionally including date bounds
    filters = ["language:en", "has_abstract:true"]
    if from_publication_date:
        filters.append(f"from_publication_date:{from_publication_date}")
    if to_publication_date:
        filters.append(f"to_publication_date:{to_publication_date}")

    params = {
        "search": query,
        "filter": ",".join(filters),
        "per_page": per_page,
        "sort": "relevance_score:desc",
        "mailto": MAILTO,
    }
    resp = requests.get(BASE_URL, params=params, timeout=60)
    resp.raise_for_status()
    data = resp.json()
    results = data.get("results", [])
    return results or []


def embed_query_from_abstract(abstract_text: str) -> np.ndarray:
    """
    Sorgu için embedding üretir (abstract alanını kullanarak).
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
    OpenAlex work için embedding üretir.
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


def fetch_with_progressive_relaxation(
    tokens: List[str],
    per_page: int = 30,
    min_terms: int = 1,
    from_publication_date: str | None = None,
    to_publication_date: str | None = None,
) -> Tuple[List[dict], str]:
    """
    Token/phrase listesinden:
      - önce hepsiyle OpenAlex'ten sonuç çek,
      - sonuç yoksa rastgele bir tanesini sil ve tekrar dene,
      - min_terms sayısına inince dur.
    """
    current_tokens = list(tokens)

    while len(current_tokens) >= min_terms:
        query = " ".join(current_tokens)
        print(f"   Trying query: \"{query}\"")
        works = fetch_openalex_candidates(
            query,
            per_page=per_page,
            from_publication_date=from_publication_date,
            to_publication_date=to_publication_date,
        )
        print(f"   -> Fetched {len(works)} works.\n")

        if works:
            return works, query

        if len(current_tokens) == min_terms:
            break

        drop_idx = random.randrange(len(current_tokens))
        dropped = current_tokens.pop(drop_idx)
        print(f"   No results, dropping random token/phrase: '{dropped}' (remaining: {current_tokens})")

    return [], " ".join(current_tokens)


# =========================== MAIN PIPELINE ==========================


def rerank_openalex_for_abstracts(
    abstracts: List[str],
    user_keywords_raw: str = "",
    per_group: int = 30,
    top_k: int = 90,
    from_publication_date: str | None = None,
    to_publication_date: str | None = None,
) -> List[dict]:
    """
    Çoklu abstract + opsiyonel kullanıcı keyword'leri için:

      1) Her abstract'tan 2–3 phrase çıkar (Gemini + heuristic)
      2) Position-bazlı gruplar + progressive relaxation ile OpenAlex'ten aday works topla
      3) Kullanıcı keyword'leriyle ekstra aday topla
      4) Her abstract için query embedding üret
      5) Tüm adayları embedding'lerle skorla ve toplam similarity'e göre sırala

    Çıktı: her eleman bir dict:
      {
        "total_score": float,
        "per_abstract_sims": [float, ...],
        "per_abstract_contribs": [float, ...],  # oran, 0–1
        "work": { ... OpenAlex work JSON ... }
      }
    """
    max_terms = 3

    print(f"\nReceived {len(abstracts)} abstracts.")
    print(f"User keywords raw: '{user_keywords_raw}'\n")

    all_works_by_id: Dict[str, dict] = {}
    all_keyword_lists: List[List[str]] = []

    # 1) Abstract'lardan keyword/phrase listeleri çıkar (varsa)
    if abstracts:
        # 1-a) Her abstract için keyword/phrase listesi (LLM'den veya heuristic'ten)
        for idx, abs_text in enumerate(abstracts, start=1):
            print(f"=== ABSTRACT {idx} (first 300 chars) ===")
            print(abs_text[:300] + ("..." if len(abs_text) > 300 else ""))
            print()

            raw_query = abstract_to_openalex_query_gemini(abs_text, max_terms=max_terms)

            phrases = [p.strip() for p in raw_query.split(";") if p.strip()]
            if not phrases:
                phrases = raw_query.split()
            if len(phrases) > max_terms:
                phrases = phrases[:max_terms]

            print(f"→ Keywords/phrases for abstract {idx}: {phrases}\n")

            all_keyword_lists.append(phrases)

        if all_keyword_lists:
            num_positions = max(len(kws) for kws in all_keyword_lists)
            print(f"Max keyword/phrase positions across abstracts: {num_positions}\n")

            # 2) Position-bazlı gruplar ile OpenAlex'ten aday topla
            for pos in range(num_positions):
                group_tokens: List[str] = []
                for kws in all_keyword_lists:
                    if len(kws) > pos:
                        group_tokens.append(kws[pos])

                if not group_tokens:
                    continue

                # Case-insensitive dedup
                seen = set()
                unique_group_tokens: List[str] = []
                for t in group_tokens:
                    key = t.lower()
                    if key in seen:
                        continue
                    seen.add(key)
                    unique_group_tokens.append(t)

                group_tokens = unique_group_tokens

                print(f"=== Position {pos+1} initial phrases ===")
                print(f"Phrases: {group_tokens}\n")

                works, final_query = fetch_with_progressive_relaxation(
                    tokens=group_tokens,
                    per_page=per_group,
                    min_terms=1,
                    from_publication_date=from_publication_date,
                    to_publication_date=to_publication_date,
                )

                print(f"Final query used at position {pos+1}: \"{final_query}\"")
                print(f"Total works collected for this position: {len(works)}\n")

                for w in works:
                    wid = w.get("id")
                    if not wid:
                        continue
                    all_works_by_id[wid] = w

    # 3) Kullanıcı keyword'leri ile ekstra OpenAlex araması
    if user_keywords_raw:
        print("=== Extra OpenAlex search with user-provided KEYWORDS ===")
        print(f"Raw keywords: {user_keywords_raw}\n")

        kw_tokens = re.split(r"[;,]", user_keywords_raw)
        kw_tokens = [t.strip() for t in kw_tokens if t.strip()]

        if kw_tokens:
            print(f"Keyword tokens: {kw_tokens}\n")

            works_kw, final_kw_query = fetch_with_progressive_relaxation(
                tokens=kw_tokens,
                per_page=per_group,
                min_terms=1,
                from_publication_date=from_publication_date,
                to_publication_date=to_publication_date,
            )

            print(f"Final keyword query: \"{final_kw_query}\"")
            print(f"Total works collected from user keywords: {len(works_kw)}\n")

            for w in works_kw:
                wid = w.get("id")
                if not wid:
                    continue
                all_works_by_id[wid] = w

    print(f"Total unique candidate works collected (including user keywords if any): {len(all_works_by_id)}\n")

    if not all_works_by_id:
        print("No candidates collected from OpenAlex. Try different abstracts or relax filters.")
        return []

    # 4) Sorgu embedding'leri
    # Kullanıcı keyword girdiyse: abstracts varsa abstract + user keywords, yoksa sadece keywords.
    # Kullanıcı keyword yoksa: abstracts varsa LLM keywords'ten, yoksa hiçbir şey (ama bu durumda zaten erken dönerdik).
    query_vecs: List[np.ndarray] = []

    # user_keywords_raw string'ini token'lara ayıralım
    user_kw_tokens: List[str] = []
    if user_keywords_raw:
        user_kw_tokens = [t.strip() for t in re.split(r"[;,]", user_keywords_raw) if t.strip()]

    if abstracts:
        # Her abstract için ayrı query vektörü
        for idx, abs_text in enumerate(abstracts):
            if user_kw_tokens:
                # Kullanıcı keyword verdiyse: onları abstract ile birlikte kullan
                query_text = abs_text + " " + " ".join(user_kw_tokens)
            else:
                # Kullanıcı keyword vermediyse: o abstract için LLM'den çıkan phrase'leri kullan
                phrases_for_abs: List[str] = []
                if idx < len(all_keyword_lists):
                    phrases_for_abs = all_keyword_lists[idx]

                if phrases_for_abs:
                    query_text = " ".join(phrases_for_abs)
                else:
                    # Güvenlik için fallback: sadece abstract
                    query_text = abs_text

            q_vec = embed_query_from_abstract(query_text)
            query_vecs.append(q_vec)
    elif user_kw_tokens:
        # Abstract yok, sadece kullanıcı keyword'leri var → tek bir query vektörü
        query_text = " ".join(user_kw_tokens)
        q_vec = embed_query_from_abstract(query_text)
        query_vecs.append(q_vec)

    # 5) Tüm candidate makaleleri re-rank et
    scored: List[Tuple[float, List[float], str, str, dict]] = []

    for w in all_works_by_id.values():
        try:
            wid, title, v = embed_work(w)
        except RuntimeError as e:
            print(f"Skipping a work due to embedding error: {e}")
            continue

        sims = [float(np.dot(q_vec, v)) for q_vec in query_vecs]
        total_sim = sum(sims)

        scored.append((total_sim, sims, wid, title, w))

    if not scored:
        print("No valid embeddings produced for works.")
        return []

    scored.sort(key=lambda x: x[0], reverse=True)
    scored = scored[:top_k]

    # 6) oranları hesapla ve dict haline getir
    results: List[dict] = []
    for total, sims, wid, title, work in scored:
        if total > 0:
            contribs = [s / total for s in sims]
        else:
            contribs = [0.0 for _ in sims]

        results.append(
            {
                "total_score": total,
                "per_abstract_sims": sims,
                "per_abstract_contribs": contribs,
                "work": work,
            }
        )

    return results
