import os
import logging
from qdrant_client import QdrantClient, AsyncQdrantClient

logger = logging.getLogger(__name__)

QDRANT_URL = os.getenv('QDRANT_URL')
COLLECTION_NAME = 'ragvaani_docs_v2'
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')

def get_qdrant_client() -> QdrantClient:
    # 1. Try environment URL if set
    if QDRANT_URL:
        try:
            logger.info(f"Connecting to Qdrant at environment URL: {QDRANT_URL}")
            client = QdrantClient(url=QDRANT_URL, timeout=5)
            client.get_collections()
            return client
        except Exception as e:
            logger.warning(f"Could not connect to QDRANT_URL ({QDRANT_URL}): {e}. Falling back...")

    # 2. Try default localhost
    default_url = 'http://localhost:6333'
    try:
        client = QdrantClient(url=default_url, timeout=2)
        client.get_collections()
        return client
    except Exception:
        pass

    # 3. Fall back to local file-based client (does not need Docker)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = os.path.join(base_dir, 'qdrant_db')
    logger.info(f"Local Qdrant server not running. Falling back to local storage path: {db_path}")
    return QdrantClient(path=db_path)

qdrant = get_qdrant_client()

# Configure corresponding AsyncQdrantClient
def get_async_qdrant_client(sync_client: QdrantClient) -> AsyncQdrantClient:
    # Check if the sync client is using a local path or a remote URL
    if QDRANT_URL:
        return AsyncQdrantClient(url=QDRANT_URL, timeout=5)
    
    try:
        # If the sync client is connecting to localhost Qdrant server
        if hasattr(sync_client, '_client') and sync_client._client.__class__.__name__ == 'QdrantRemote':
            return AsyncQdrantClient(url='http://localhost:6333', timeout=2)
    except Exception:
        pass
        
    # If falling back to local files, we return None to signify we should use sync client with thread pool
    return None

qdrant_async = get_async_qdrant_client(qdrant)