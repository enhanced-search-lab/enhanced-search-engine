from qdrant_client import QdrantClient
import os
from dotenv import load_dotenv

# .env yükle (venv içinden çalıştırdığın için aynı klasörde olsun)
load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
    prefer_grpc=False,  # HTTP kullan, cloud'da genelde böyle
)

res = client.count(collection_name="qdrant_paper", exact=True)
print(res.count)
