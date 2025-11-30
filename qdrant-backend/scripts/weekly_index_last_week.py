# scripts/weekly_index_last_week.py

import sys
import json
import time
from typing import List
from pathlib import Path
from datetime import date, timedelta

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

# ==== PYTHONPATH FIX: locate the app folder ====
THIS_FILE = Path(__file__).resolve()

PROJECT_ROOT = None
for parent in THIS_FILE.parents:
    if (parent / "app").is_dir():
        PROJECT_ROOT = parent
        break

if PROJECT_ROOT is None:
    raise RuntimeError("app folder not found, PROJECT_ROOT could not be determined.")

sys.path.insert(0, str(PROJECT_ROOT))
# ===============================================

from app.embeddings import build_final_embedding_for_work
from app.openalex_client import fetch_works_page, work_to_text_fields


# --- QDRANT SETTINGS ---
QDRANT_HOST = "localhost"
QDRANT_PORT = 6333
QDRANT_COLLECTION = "papers_pq"

PER_PAGE = 200  # OpenAlex items per page


def work_id_to_int(work_id: str) -> int:
    """'W3038568908' -> 3038568908"""
    return int(work_id[1:])  # drop the leading 'W'


def main():
    # Calculate last 7 days
    today = date.today()
    week_ago = today - timedelta(days=7)

    start_date = week_ago.isoformat()  # 'YYYY-MM-DD'
    end_date = today.isoformat()       # 'YYYY-MM-DD'

    print(f"Indexing for the last 1 week: {start_date} → {end_date}")

    client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

    cursor = "*"
    total_indexed = 0
    page_idx = 0

    while cursor is not None:
        page_idx += 1
        print(f"\n=== Fetching page {page_idx} (cursor={cursor}) ===")

        # Assuming fetch_works_page supports these parameters.
        # If not supported, a different example function will be needed.
        data = fetch_works_page(
            cursor=cursor,
            per_page=PER_PAGE,
            from_publication_date=start_date,
            to_publication_date=end_date,
        )

        works = data.get("results", [])
        next_cursor = data.get("meta", {}).get("next_cursor")

        if not works:
            print("No works found on this page, exiting.")
            break

        points: List[PointStruct] = []

        for w in works:
            work_id, title, abstract_text, topics_text, concepts_text = work_to_text_fields(w)
            publication_date = w.get("publication_date")  # 'YYYY-MM-DD' or None

            v_final = build_final_embedding_for_work(
                title=title,
                abstract=abstract_text,
                topics_text=topics_text or None,
                concepts_text=concepts_text or None,
            )
            if v_final is None:
                continue

            internal_id = work_id_to_int(work_id)

            points.append(
                PointStruct(
                    id=internal_id,
                    vector=v_final.tolist(),
                    payload={
                        "publication_date": publication_date,
                    },
                )
            )

        if points:
            client.upsert(
                collection_name=QDRANT_COLLECTION,
                points=points,
            )
            total_indexed += len(points)
            print(f"Works added in this page: {len(points)}. Total: {total_indexed}")
        else:
            print("No points to insert on this page.")

        cursor = next_cursor
        if not cursor:
            print("No more cursor from OpenAlex (weekly window finished).")
            break

        time.sleep(0.3)  # Be gentle to OpenAlex :)

    print(f"\nWeekly run completed. Total indexed works: {total_indexed}")


if __name__ == "__main__":
    main()
