import os
import sys
import json
import time
from typing import List
from pathlib import Path

# --- PYTHON PATH FIX (allows app/ imports even when running from scripts/) ---
THIS_FILE = Path(__file__).resolve()

PROJECT_ROOT = None
for parent in THIS_FILE.parents:
    # Look for the app folder here; checks if proxima-backend/app exists
    if (parent / "app").is_dir():
        PROJECT_ROOT = parent
        break

if PROJECT_ROOT is None:
    raise RuntimeError("app folder not found, PROJECT_ROOT could not be determined.")

sys.path.insert(0, str(PROJECT_ROOT))
# --- AFTER THIS, app.* CAN BE IMPORTED ---

from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

from app.embeddings import build_final_embedding_for_work
from app.openalex_client import fetch_works_page, work_to_text_fields

# --- QDRANT SETTINGS ---
QDRANT_HOST = "209.38.203.54"
QDRANT_PORT = 6333
QDRANT_COLLECTION = "papers_pq"

# Number of new works to index on EACH RUN
TARGET_WORKS_PER_RUN = 100_000
PER_PAGE = 200

# Small state file to store the OpenAlex cursor
STATE_FILE = "openalex_papers_pq_state.json"


def work_id_to_int(work_id: str) -> int:
    """
    'W3038568908' -> 3038568908 (int)
    Qdrant will use this int as the primary key.
    """
    return int(work_id[1:])  # drop the leading 'W'


def load_state():
    """
    Read previously saved cursor if available; otherwise start with '*'.
    """
    if not os.path.exists(STATE_FILE):
        return {
            "cursor": "*",
            "total_indexed_global": 0,
        }
    with open(STATE_FILE, "r") as f:
        return json.load(f)


def save_state(state: dict):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def main():
    client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

    state = load_state()
    cursor = state.get("cursor", "*")
    total_indexed_global = state.get("total_indexed_global", 0)

    total_indexed_this_run = 0
    page_idx = 0

    print(f"Starting cursor: {cursor}, global indexed: {total_indexed_global}")

    while total_indexed_this_run < TARGET_WORKS_PER_RUN and cursor is not None:
        page_idx += 1
        print(f"\n=== Fetching page {page_idx} (cursor={cursor}) ===")

        data = fetch_works_page(cursor=cursor, per_page=PER_PAGE)

        works = data.get("results", [])
        next_cursor = data.get("meta", {}).get("next_cursor")

        if not works:
            print("No works in this page, exiting.")
            break

        points: List[PointStruct] = []

        for w in works:
            work_id, title, abstract_text, topics_text, concepts_text = work_to_text_fields(w)

            # publication_date is only stored as metadata
            publication_date = w.get("publication_date")  # something like '2025-03-15' or None

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
                    id=internal_id,  # ✅ Qdrant requires int IDs
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
            total_indexed_this_run += len(points)
            total_indexed_global += len(points)
            print(
                f"Works added in this page: {len(points)}. "
                f"Run total: {total_indexed_this_run}, Global total: {total_indexed_global}"
            )
        else:
            print("No points to insert in this page.")

        # Stop if target for this run is reached
        if total_indexed_this_run >= TARGET_WORKS_PER_RUN:
            print(f"\nReached the run target of {TARGET_WORKS_PER_RUN} works. Stopping.")
            cursor = next_cursor  # save cursor for the next run
            break

        cursor = next_cursor
        if not cursor:
            print("No further cursor from OpenAlex (last page).")
            break

        time.sleep(0.3)  # Be gentle to OpenAlex :)

    # Save cursor and global count → next run will resume from here
    state["cursor"] = cursor
    state["total_indexed_global"] = total_indexed_global
    save_state(state)

    print(f"\nRun finished. New cursor: {cursor}, Global indexed: {total_indexed_global}")


if __name__ == "__main__":
    main()
