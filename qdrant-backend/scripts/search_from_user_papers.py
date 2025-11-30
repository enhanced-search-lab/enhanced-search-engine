# scripts/search_from_user_papers.py

from typing import List
from qdrant_client import QdrantClient

from app.embeddings import build_query_embedding_from_seed_papers

# Qdrant settings – must match create_collection.py
QDRANT_HOST = "209.38.203.54"
QDRANT_PORT = 6333
QDRANT_COLLECTION = "papers_pq"


def _qdrant_search_vector(
    client: QdrantClient,
    vector: List[float],
    limit: int,
):
    """
    Selects the correct search method depending on the qdrant-client version.
    Always attempts to return a list of ScoredPoint.
    """
    # New API: query_points
    if hasattr(client, "query_points"):
        resp = client.query_points(
            collection_name=QDRANT_COLLECTION,
            query=vector,
            limit=limit,
            with_payload=True,
        )
        # In newer versions resp.points exists, in some it may be a plain list
        if hasattr(resp, "points"):
            return resp.points
        return resp

    # Some older versions: search_points
    if hasattr(client, "search_points"):
        resp = client.search_points(
            collection_name=QDRANT_COLLECTION,
            vector=vector,
            limit=limit,
            with_payload=True,
        )
        if hasattr(resp, "result"):
            return resp.result
        return resp

    # Even older versions: search
    if hasattr(client, "search"):
        return client.search(
            collection_name=QDRANT_COLLECTION,
            query_vector=vector,
            limit=limit,
            with_payload=True,
        )

    raise RuntimeError(
        "No compatible search method found in this qdrant-client version."
    )


def search_similar_papers(
    abstracts: List[str],
    shared_keywords: List[str],
    limit: int = 20,
):
    """
    Generates a query embedding from multiple user abstracts + a shared keyword list
    and returns similar papers from Qdrant.
    """
    print(">> Computing query embedding...")
    q_vec = build_query_embedding_from_seed_papers(
        abstracts=abstracts,
        shared_keywords=shared_keywords,
    )

    if q_vec is None:
        raise ValueError(
            "Could not generate a valid query embedding (abstract list may be empty)."
        )

    print(">> Connecting to Qdrant...")
    client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

    print(">> Searching within Qdrant...")
    results = _qdrant_search_vector(
        client=client,
        vector=q_vec.tolist(),
        limit=limit,
    )

    print(f">> Number of results returned: {len(results)}")
    return results


def print_results(results):
    """
    Print Qdrant search results in a readable format.
    Since we currently store only 'publication_date' in the payload,
    we display: ID + score + publication_date.
    """
    if not results:
        print("No results found.")
        return

    print("\n=== MOST SIMILAR PAPERS ===\n")
    for rank, point in enumerate(results, start=1):
        payload = getattr(point, "payload", None) or {}
        pub_date = payload.get("publication_date")

        print(f"#{rank}  id={point.id}  score={point.score:.4f}")
        if pub_date:
            print(f"    Publication date: {pub_date}")
        print("-" * 60)



if __name__ == "__main__":
    # Hardcoded for testing; later can be replaced with CLI arguments
    # or data passed from an API.
    seed_abstracts = [
        "This paper introduces a deep learning model for medical image analysis and diagnosis.",
        "We investigate artificial intelligence based decision support systems in healthcare.",
    ]

    shared_keywords = [
        "artificial intelligence",
        "medical imaging",
        "healthcare",
    ]

    print("### search_from_user_papers.py is running ###")

    results = search_similar_papers(
        abstracts=seed_abstracts,
        shared_keywords=shared_keywords,
        limit=20,
    )

    print_results(results)
