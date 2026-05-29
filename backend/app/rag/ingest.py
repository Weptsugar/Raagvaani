import os
import uuid
import logging
import re
# CSV size limits removed since we use Pandas now

from collections import Counter
from typing import Optional

from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams, Distance, SparseVectorParams,
    PointStruct, SparseVector
)
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

try:
    import docx
except ImportError:
    docx = None  # type: ignore[assignment]

try:
    import openpyxl
except ImportError:
    openpyxl = None  # type: ignore[assignment]

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
from app.core.config import qdrant, COLLECTION_NAME


# ── Collection Management ────────────────────────────────────────────────────

def ensure_collection():
    """Create the Qdrant collection with dense + sparse vectors if it doesn't exist."""
    collections = [c.name for c in qdrant.get_collections().collections]
    if COLLECTION_NAME not in collections:
        logger.info('Creating Qdrant collection with dense + sparse vectors...')
        qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config={
                'dense': VectorParams(size=1536, distance=Distance.COSINE)
            },
            sparse_vectors_config={
                'sparse': SparseVectorParams()
            }
        )
        # Index user_id for fast per-user filtering
        qdrant.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name='user_id',
            field_schema='keyword'
        )
        logger.info('Collection created.')
    else:
        logger.info('Collection already exists.')


# ── Embedding & Sparse Vector ────────────────────────────────────────────────

def get_dense_embeddings(texts: list[str]) -> list[list[float]]:
    """Get dense embeddings from OpenAI text-embedding-3-small."""
    response = client.embeddings.create(
        model='text-embedding-3-small',
        input=texts
    )
    return [item.embedding for item in response.data]


def get_sparse_vector(text: str) -> SparseVector:
    """Simple BM25-like sparse vector using term frequency hashing."""
    words = re.findall(r'\b\w+\b', text.lower())
    counts = Counter(words)
    total = sum(counts.values()) if counts else 1

    index_to_value = {}
    for w, count in counts.items():
        idx = hash(w) % 30000
        val = count / total
        index_to_value[idx] = index_to_value.get(idx, 0.0) + val

    sorted_indices = sorted(index_to_value.keys())
    sorted_values = [index_to_value[idx] for idx in sorted_indices]

    return SparseVector(indices=sorted_indices, values=sorted_values)


# ── Text Extraction ───────────────────────────────────────────────────────────

def extract_pdf(file_path: str) -> list[str]:
    """Load a PDF and split into text chunks."""
    loader = PyPDFLoader(file_path)
    docs = loader.load()
    splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=80)
    chunks = splitter.split_documents(docs)
    return [c.page_content for c in chunks if c.page_content.strip()]


def extract_docx(file_path: str) -> list[str]:
    """Extract text from a Word document and split into chunks."""
    if docx is None:
        raise ImportError('python-docx is not installed. Run: pip install python-docx')
    doc = docx.Document(file_path)
    full_text = '\n'.join([p.text for p in doc.paragraphs if p.text.strip()])
    splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=80)
    return splitter.split_text(full_text)


def extract_txt(file_path: str) -> list[str]:
    """Read a plain text file and split into chunks."""
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=80)
    return splitter.split_text(content)





# ── Main Ingestion ────────────────────────────────────────────────────────────

def ingest_file(file_path: str, user_id: str, original_name: str, file_type: str, file_id: Optional[int] = None, document_id: Optional[str] = None):
    """Ingest a file: extract text, embed, and upsert into Qdrant (or validate if Pandas-native)."""
    ext = file_type.lower()
    
    # Bypass Qdrant for analytical files (CSV/XLSX)
    if ext in ['csv', 'xlsx']:
        logger.info(f'Bypassing Qdrant ingestion for analytical file: {original_name}')
        try:
            import pandas as pd
            if ext == 'csv':
                pd.read_csv(file_path, nrows=5)
            else:
                pd.read_excel(file_path, nrows=5)
            logger.info(f'Successfully validated {ext.upper()} structure for {original_name}')
            return
        except ImportError:
            logger.error('Pandas not installed')
            raise
        except Exception as e:
            logger.error(f'Failed to parse {ext.upper()}: {e}')
            raise ValueError(f'Invalid {ext.upper()} file format')

    logger.info(f'Starting ingestion: {original_name} for user {user_id}')
    ensure_collection()

    # Extract text chunks based on file type
    if ext == 'pdf':
        chunks = extract_pdf(file_path)
    elif ext == 'docx':
        chunks = extract_docx(file_path)
    elif ext == 'txt':
        chunks = extract_txt(file_path)
    else:
        raise ValueError(f'Unsupported file type: {ext}')

    if not chunks:
        logger.warning('No text extracted from file')
        return

    logger.info(f'Extracted {len(chunks)} chunks')

    # Get dense embeddings in batches of 100
    all_embeddings: list[list[float]] = []
    for i in range(0, len(chunks), 100):
        batch = chunks[i:i + 100]
        embeddings = get_dense_embeddings(batch)
        all_embeddings.extend(embeddings)

    # Build PointStruct list with both dense + sparse vectors
    points = []
    for i, (chunk, dense_emb) in enumerate(zip(chunks, all_embeddings)):
        sparse_vec = get_sparse_vector(chunk)
        points.append(
            PointStruct(
                id=str(uuid.uuid4()),
                vector={
                    'dense': dense_emb,
                    'sparse': sparse_vec
                },
                payload={
                    'text': chunk,
                    'user_id': user_id,
                    'filename': original_name,
                    'file_type': ext,
                    'chunk_index': i,
                    'file_id': file_id,
                    'document_id': document_id
                }
            )
        )

    # Upsert in batches of 50
    for i in range(0, len(points), 50):
        batch = points[i:i + 50]
        qdrant.upsert(collection_name=COLLECTION_NAME, points=batch)

    logger.info(f'Ingestion complete: {len(points)} vectors upserted')


def delete_file_vectors(user_id: str, file_id: int, filename: str, document_id: Optional[str] = None):
    """Delete all vectors for a given document_id, file_id, or filename from Qdrant."""
    from qdrant_client.models import Filter, FieldCondition, MatchValue
    try:
        ensure_collection()
        # 1. Delete by document_id if provided (most robust)
        if document_id:
            qdrant.delete(
                collection_name=COLLECTION_NAME,
                points_selector=Filter(
                    must=[
                        FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                        FieldCondition(key="document_id", match=MatchValue(value=document_id))
                    ]
                )
            )
        # 2. Delete by file_id
        qdrant.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[
                    FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                    FieldCondition(key="file_id", match=MatchValue(value=file_id))
                ]
            )
        )
        # 3. Delete by filename (for compatibility with older records)
        qdrant.delete(
            collection_name=COLLECTION_NAME,
            points_selector=Filter(
                must=[
                    FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                    FieldCondition(key="filename", match=MatchValue(value=filename))
                ]
            )
        )
        logger.info(f"Successfully deleted Qdrant vectors for document_id {document_id} / file {file_id}")
    except Exception as e:
        logger.error(f"Failed to delete Qdrant vectors for file {file_id}: {e}")


# Backward-compat alias for any legacy callers
def ingest_pdf(
    file_path: str,
    user_id: str = 'legacy',
    original_name: str = 'document.pdf'
):
    ingest_file(file_path, user_id, original_name, 'pdf')