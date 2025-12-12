import os
import sys

# Add project root to PYTHONPATH (useful when running from scripts/)
CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
sys.path.append(PROJECT_ROOT)

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    ProductQuantizationConfig,
)
from app.embeddings import EMBED_DIM

# If you are using a remote Qdrant instance:
QDRANT_URL = "http://209.38.203.54:6333"
QDRANT_COLLECTION = "papers_pq"   # PQ-enabled collection


def main():
    client = QdrantClient(url=QDRANT_URL)

    client.recreate_collection(
        collection_name=QDRANT_COLLECTION,
        vectors_config=VectorParams(
            size=EMBED_DIM,
            distance=Distance.COSINE,
        ),
        quantization_config={
            "product": ProductQuantizationConfig(
                compression="x16",   # x4, x8, x16, x32
                always_ram=True,
            )
        },
    )

    print(f"✅ PQ Collection '{QDRANT_COLLECTION}' recreated on {QDRANT_URL}.")


if __name__ == "__main__":
    main()
