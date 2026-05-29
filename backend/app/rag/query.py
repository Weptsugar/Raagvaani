import os
import json
import time
import logging
import asyncio

from openai import AsyncOpenAI
from qdrant_client.models import (
    Filter, FieldCondition, MatchValue,
    Prefetch, FusionQuery, Fusion
)
from app.rag.cache import check_cache, set_cache
from app.rag.ingest import get_sparse_vector
from app.core.config import qdrant, qdrant_async, COLLECTION_NAME
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client_async = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Minimum RRF score to use direct_lookup route (skip LLM)
# Disabled by setting to 999.0 (since RRF scores <= 1.0) so LLM is always used for Q&A.
SCORE_THRESHOLD = 999.0

LANG_MAP = {'en': 'English', 'hi': 'Hindi'}


# ── Async Embeddings ─────────────────────────────────────────────────────────

async def get_dense_embeddings_async(texts: list[str]) -> list[list[float]]:
    """Get dense embeddings asynchronously from OpenAI text-embedding-3-small."""
    response = await client_async.embeddings.create(
        model='text-embedding-3-small',
        input=texts
    )
    return [item.embedding for item in response.data]


# ── Hybrid Search ────────────────────────────────────────────────────────────

async def search_hybrid(query: str, user_id: str, limit: int = 8, file_id: int | None = None, document_id: str | None = None) -> list[dict]:
    """Hybrid RRF search scoped to a single user's documents and optional file/document context."""
    dense_vecs = await get_dense_embeddings_async([query])
    dense_vec = dense_vecs[0]
    sparse_vec = get_sparse_vector(query)

    must_conditions = [FieldCondition(key='user_id', match=MatchValue(value=user_id))]
    if document_id is not None:
        must_conditions.append(FieldCondition(key='document_id', match=MatchValue(value=document_id)))
    elif file_id is not None:
        must_conditions.append(FieldCondition(key='file_id', match=MatchValue(value=file_id)))

    user_filter = Filter(must=must_conditions)

    # Use native AsyncQdrantClient if Qdrant is running as a server (Docker)
    if qdrant_async:
        results = await qdrant_async.query_points(
            collection_name=COLLECTION_NAME,
            prefetch=[
                Prefetch(query=dense_vec, using='dense', limit=20, filter=user_filter),
                Prefetch(query=sparse_vec, using='sparse', limit=20, filter=user_filter),
            ],
            query=FusionQuery(fusion=Fusion.RRF),
            limit=limit,
            with_payload=True,
            with_vectors=False
        )
    else:
        # Fall back to running sync client queries in a thread pool (for local file-based storage)
        results = await asyncio.to_thread(
            qdrant.query_points,
            collection_name=COLLECTION_NAME,
            prefetch=[
                Prefetch(query=dense_vec, using='dense', limit=20, filter=user_filter),
                Prefetch(query=sparse_vec, using='sparse', limit=20, filter=user_filter),
            ],
            query=FusionQuery(fusion=Fusion.RRF),
            limit=limit,
            with_payload=True,
            with_vectors=False
        )

    return [
        {
            'text': p.payload.get('text', ''),
            'filename': p.payload.get('filename', 'document'),
            'chunk_index': p.payload.get('chunk_index', 0),
            'score': p.score
        }
        for p in results.points
        if p.payload
    ]


# ── Dual Output Generation ────────────────────────────────────────────────────

async def generate_dual_output(
    query: str,
    context_chunks: list[dict],
    language: str,
    route: str
) -> dict:
    """Generate ui_markdown and voice_prose via GPT-4o-mini."""
    lang_name = LANG_MAP.get(language, 'English')

    if route == 'direct_lookup':
        # High-confidence hit — surface the top chunk directly without LLM
        top = context_chunks[0]
        raw = top['text']
        source = top['filename']

        if language == 'hi':
            ui = f'### {source} से\n\n{raw}'
        else:
            ui = f'### From {source}\n\n{raw}'

        # Strip markdown symbols for TTS
        prose = (
            raw
            .replace('#', '')
            .replace('*', '')
            .replace('`', '')
            .replace('\n', ' ')
            .strip()
        )

        return {
            'ui_markdown': ui,
            'voice_prose': prose,
            'route': 'direct_lookup',
            'sources': [top['filename']]
        }

    # ── LLM Core path ──────────────────────────────────────────────────────
    context_text = '\n\n---\n\n'.join(
        [f'[Source: {c["filename"]}]\n{c["text"]}' for c in context_chunks]
    )

    system_prompt = f"""You are RagVaani, an expert bilingual document assistant.

You MUST respond ONLY in {lang_name}.

Your response MUST be a valid JSON object strictly conforming to this exact schema:
{{
  "ui_markdown": "Your detailed answer formatted in Markdown here...",
  "voice_prose": "Your plain-text natural-flowing spoken version here..."
}}

CRITICAL INSTRUCTIONS:
1. Do NOT create your own JSON keys (e.g., do NOT return "source_document", "concepts", or anything else). You MUST only return "ui_markdown" and "voice_prose".
2. The "ui_markdown" value MUST be a single string containing rich Markdown (use ### headers, bold text, bullet points, and inline backticks for mathematical formulas like `nPr = n! / (n-r)!`). Make sure the explanation is structured, step-by-step, clean, and highly readable. Start the response by mentioning the source document.
3. The "voice_prose" value MUST be a single plain-text string, with no markdown or raw math equations (spell out formulas like "n factorial divided by n minus r factorial" instead of symbols) as this will be read aloud by a text-to-speech engine.
4. STRICT TRUTHFULNESS: Base your answer strictly and ONLY on the provided context. If the answer is not explicitly contained in the provided context (e.g., if the user asks something completely unrelated to the document content), you MUST state clearly that the information is not available in the uploaded document. Do NOT use your own pre-trained knowledge to answer.

Return ONLY the JSON object, no other text."""

    user_msg = f"""Context from uploaded documents:
{context_text}

User question: {query}"""

    response = await client_async.chat.completions.create(
        model='gpt-4o-mini',
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_msg}
        ],
        response_format={'type': 'json_object'}
    )

    raw_content = response.choices[0].message.content
    parsed = json.loads(raw_content)
    
    ui_markdown = parsed.get('ui_markdown', raw_content)
    if not isinstance(ui_markdown, str):
        ui_markdown = json.dumps(ui_markdown, indent=2)
        
    voice_prose = parsed.get('voice_prose', raw_content)
    if not isinstance(voice_prose, str):
        voice_prose = json.dumps(voice_prose, indent=2)

    sources = list(set(c['filename'] for c in context_chunks))

    return {
        'ui_markdown': ui_markdown,
        'voice_prose': voice_prose,
        'route': 'llm_core',
        'sources': sources
    }


# ── Fallback (no documents) ───────────────────────────────────────────────────

def generate_fallback(query: str, language: str) -> dict:
    """Response when no documents are found in Qdrant for this user."""
    if language == 'hi':
        ui = (
            '> ⚠️ **आपके दस्तावेज़ में यह नहीं मिला।**\n\n'
            'कृपया पहले एक दस्तावेज़ अपलोड करें, फिर प्रश्न पूछें।'
        )
        prose = (
            'आपके अपलोड किए गए दस्तावेज़ में यह जानकारी नहीं मिली। '
            'कृपया पहले एक दस्तावेज़ अपलोड करें।'
        )
    else:
        ui = (
            '> ⚠️ **No documents found in your workspace.**\n\n'
            'Please upload a PDF, DOCX, Excel, or text file first, then ask your question.'
        )
        prose = (
            'No documents were found in your workspace. '
            'Please upload a file first and then ask your question.'
        )

    return {
        'ui_markdown': ui,
        'voice_prose': prose,
        'route': 'no_documents',
        'sources': []
    }


# ── Main Query Router ─────────────────────────────────────────────────────────

async def process_query(query: str, user_id: str, language: str = 'en', file_id: int | None = None, document_id: str | None = None, db=None) -> dict:
    """
    Three-layer query router (Asynchronous):
      Layer 1 — Static cache (greetings / help) and Redis exact cache
      Layer 1.5 — SQLite document presence check
      Layer 2 — Document Type Router (Pandas for CSV/XLSX)
      Layer 3 — Hybrid Qdrant search -> GPT-4o-mini
    """
    start = time.time()

    # Layer 1: Cache check (both static and Redis exact)
    cached = await check_cache(
        query=query,
        user_id=user_id,
        language=language,
        file_id=file_id,
        document_id=document_id
    )
    if cached:
        elapsed = int((time.time() - start) * 1000)
        return {**cached, 'route': 'cache', 'sources': [], 'latency_ms': elapsed}

    # Layer 1.5: Strict Pre-Filtering (SQLite Pre-check)
    if db:
        from sqlmodel import select
        from app.db.models import UploadedFile
        
        # Run synchronous db query in executor to avoid blocking the event loop
        def check_has_docs():
            return db.exec(select(UploadedFile).where(UploadedFile.user_id == user_id)).first()
            
        has_docs = await asyncio.to_thread(check_has_docs)
        if not has_docs:
            elapsed = int((time.time() - start) * 1000)
            return {**generate_fallback(query, language), 'latency_ms': elapsed}

    # Layer 2: Document Type Router (analytical files)
    if document_id and db:
        from sqlmodel import select
        from app.db.models import UploadedFile
        
        def get_record():
            return db.exec(select(UploadedFile).where(UploadedFile.document_id == document_id)).first()
            
        record = await asyncio.to_thread(get_record)
        if record and record.file_type.lower() in ['csv', 'xlsx']:
            import os
            from app.rag.query_dataframe import execute_pandas_query
            
            file_path = os.path.join('uploads', record.filename)
            if not os.path.exists(file_path):
                elapsed = int((time.time() - start) * 1000)
                return {**generate_fallback(query, language), 'latency_ms': elapsed}
                
            logger.info(f"Routing to Pandas engine for {record.original_name}")
            # Wrap Pandas query execution in a thread pool since it's CPU-heavy and sync
            result = await asyncio.to_thread(
                execute_pandas_query, query, file_path, record.file_type.lower(), language
            )
            result['latency_ms'] = int((time.time() - start) * 1000)
            return result

    # Layer 3: Hybrid Qdrant search
    chunks = await search_hybrid(query, user_id, file_id=file_id, document_id=document_id)

    if not chunks:
        elapsed = int((time.time() - start) * 1000)
        return {**generate_fallback(query, language), 'latency_ms': elapsed}

    # Route: direct_lookup for high-confidence hits, llm_core otherwise
    top_score = chunks[0]['score']
    route = 'direct_lookup' if top_score >= SCORE_THRESHOLD else 'llm_core'

    result = await generate_dual_output(query, chunks, language, route)
    elapsed = int((time.time() - start) * 1000)
    result['latency_ms'] = elapsed

    # Save to Redis cache for exact hits (only if it was successfully generated via LLM/Lookup)
    if result.get('route') in ['llm_core', 'direct_lookup']:
        await set_cache(
            query=query,
            response_data=result,
            user_id=user_id,
            language=language,
            file_id=file_id,
            document_id=document_id
        )

    return result