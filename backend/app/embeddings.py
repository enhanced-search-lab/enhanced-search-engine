from typing import Optional
import numpy as np
from sentence_transformers import SentenceTransformer

from app.preprocessing import preprocess_text

from typing import List

# Load the GTE model here
MODEL_NAME = "Alibaba-NLP/gte-large-en-v1.5"
EMBED_DIM = 1024

# model = SentenceTransformer(MODEL_NAME, trust_remote_code=True)

from functools import lru_cache
import os

@lru_cache(maxsize=1)
def get_model():
    # Optional: allow skipping model load for migrations/tests
    if os.getenv("SKIP_EMBED_MODEL", "0") == "1":
        raise RuntimeError("Embedding model load skipped (SKIP_EMBED_MODEL=1).")
    return SentenceTransformer(MODEL_NAME, trust_remote_code=True)


BASE_WEIGHTS = {
    "main": 0.7,
    "topic": 0.2,
    "concept": 0.1,
}


def combine_embeddings(v_main, v_topic=None, v_concept=None) -> np.ndarray:
    """
    Weights the 3-channel embedding (main/topic/concept) and
    converts it into a single normalized vector.
    If some channels are missing, weights are renormalized.
    """
    if v_main is None:
        raise ValueError("v_main (title+abstract) cannot be empty – this is the primary channel.")

    active = {}
    total_w = 0.0

    # main is always assumed to exist
    active["main"] = BASE_WEIGHTS["main"]
    total_w += BASE_WEIGHTS["main"]

    if v_topic is not None:
        active["topic"] = BASE_WEIGHTS["topic"]
        total_w += BASE_WEIGHTS["topic"]

    if v_concept is not None:
        active["concept"] = BASE_WEIGHTS["concept"]
        total_w += BASE_WEIGHTS["concept"]

    # Normalize weights (sum = 1)
    for k in active.keys():
        active[k] /= total_w

    v_final = np.zeros_like(v_main, dtype=np.float32)
    v_final += active["main"] * v_main

    if v_topic is not None:
        v_final += active.get("topic", 0.0) * v_topic

    if v_concept is not None:
        v_final += active.get("concept", 0.0) * v_concept

    # Final normalize (L2)
    norm = np.linalg.norm(v_final)
    if norm == 0:
        return v_main
    return v_final / norm


def build_final_embedding_for_work(
    title: str,
    abstract: str,
    topics_text: Optional[str] = None,
    concepts_text: Optional[str] = None,
) -> Optional[np.ndarray]:
    """
    For a single work:
    - title + abstract -> v_main
    - topics_text -> v_topic (if available)
    - concepts_text -> v_concept (if available)
    Then returns the weighted (0.7 / 0.2 / 0.1) combined + normalized final vector.
    """

    # 1) Main text: title + abstract
    main_text = ((title or "") + "\n\n" + (abstract or "")).strip()
    if not main_text:
        return None

    main_clean = preprocess_text(main_text)
    if not main_clean:
        return None

    v_main = get_model().encode([main_clean], normalize_embeddings=True)[0]

    # Topic embedding (optional)
    v_topic = None
    if topics_text:
        topics_clean = preprocess_text(topics_text)
        if topics_clean:
            v_topic = get_model().encode([topics_clean], normalize_embeddings=True)[0]

    # Concept embedding (optional)
    v_concept = None
    if concepts_text:
        concepts_clean = preprocess_text(concepts_text)
        if concepts_clean:
            v_concept = get_model().encode([concepts_clean], normalize_embeddings=True)[0]

    v_final = combine_embeddings(v_main, v_topic, v_concept)
    return v_final


def _embed_clean_text(text: str) -> Optional[np.ndarray]:
    """
    Cleans free text (abstract, keywords etc.) and converts it into a single vector.
    Returns None if text is empty / fully lost after cleaning.
    """
    if not text:
        return None

    clean = preprocess_text(text)
    if not clean:
        return None

    v = get_model().encode([clean], normalize_embeddings=True)[0]
    return v.astype(np.float32)


def _build_centroid(vectors: List[np.ndarray]) -> Optional[np.ndarray]:
    """
    Computes the average of multiple vectors and normalizes it.
    Used as the centroid vector for intersections.
    """
    if not vectors:
        return None

    arr = np.stack(vectors, axis=0).astype(np.float32)
    mean_vec = arr.mean(axis=0)
    norm = np.linalg.norm(mean_vec)
    if norm == 0:
        return mean_vec
    return (mean_vec / norm).astype(np.float32)


def build_query_embedding_from_seed_papers(
    abstracts: List[str],
    shared_keywords: Optional[List[str]] = None,
) -> Optional[np.ndarray]:
    """
    Generates a single query embedding from MULTIPLE user abstracts + shared keyword list.

    Logic:
    - Each abstract -> vector
    - Centroid of these vectors -> v_main (e.g., AI + Health intersection)
    - Shared keyword list is turned into a text string and embedded -> v_topic
    - concept channel is not used for queries -> v_concept = None
    - combine_embeddings merges (main/topic) channels with BASE_WEIGHTS.
    """

    # 1) Abstract vectors
    main_vecs: List[np.ndarray] = []
    for abs_text in abstracts:
        v = _embed_clean_text(abs_text or "")
        if v is not None:
            main_vecs.append(v)

    v_main = _build_centroid(main_vecs)
    if v_main is None:
        return None  # no valid abstract

    # 2) Shared keywords → treated like topic channel
    v_topic = None
    if shared_keywords:
        kw_text = ", ".join(
            kw.strip() for kw in shared_keywords if kw and kw.strip()
        )
        if kw_text:
            v_topic = _embed_clean_text(kw_text)

    # 3) No concept channel in query
    v_concept = None

    # 4) Final query embedding with same weighting logic
    v_final = combine_embeddings(v_main, v_topic=v_topic, v_concept=v_concept)
    return v_final
