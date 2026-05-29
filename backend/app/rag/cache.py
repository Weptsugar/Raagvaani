import json
import logging
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

# Static cache: exact lowercase match -> dual output response
STATIC_CACHE: dict[str, dict] = {
    # English
    'hello': {
        'ui_markdown': '👋 **Hello!** How can I help you today? Upload a document and ask me anything.',
        'voice_prose': 'Hello! How can I help you today? Upload a document and ask me anything.'
    },
    'hi': {
        'ui_markdown': '👋 **Hi there!** Ask me anything about your uploaded documents.',
        'voice_prose': 'Hi there! Ask me anything about your uploaded documents.'
    },
    'help': {
        'ui_markdown': '### How to use RagVaani\n\n- **Upload** a PDF, DOCX, Excel, or text file\n- **Ask questions** in English or Hindi\n- **Voice mode** — click the mic to speak your question\n- Your conversations are **saved automatically**',
        'voice_prose': 'Here is how to use RagVaani. Upload a PDF, Word document, Excel file, or text file. Then ask questions in English or Hindi. You can also click the mic button to speak your question. All your conversations are saved automatically.'
    },
    'thanks': {
        'ui_markdown': '😊 You are welcome! Feel free to ask more questions.',
        'voice_prose': 'You are welcome! Feel free to ask more questions.'
    },
    'thank you': {
        'ui_markdown': '😊 You are most welcome! Is there anything else I can help you with?',
        'voice_prose': 'You are most welcome! Is there anything else I can help you with?'
    },
    # Hindi
    'नमस्ते': {
        'ui_markdown': '🙏 **नमस्ते!** आप अपने दस्तावेज़ के बारे में कुछ भी पूछ सकते हैं।',
        'voice_prose': 'नमस्ते! आप अपने दस्तावेज़ के बारे में कुछ भी पूछ सकते हैं।'
    },
    'हेलो': {
        'ui_markdown': '👋 **हेलो!** मैं आपकी कैसे मदद कर सकता हूँ?',
        'voice_prose': 'हेलो! मैं आपकी कैसे मदद कर सकता हूँ?'
    },
    'मदद': {
        'ui_markdown': '### RagVaani का उपयोग कैसे करें\n\n- **अपलोड करें** — PDF, Word, Excel, या टेक्स्ट फ़ाइल\n- **प्रश्न पूछें** — हिंदी या अंग्रेज़ी में\n- **वॉइस मोड** — माइक बटन दबाकर बोलें\n- सभी बातचीत **स्वचालित रूप से सहेजी** जाती है',
        'voice_prose': 'RagVaani का उपयोग इस प्रकार करें। पहले PDF, Word, Excel या टेक्स्ट फ़ाइल अपलोड करें। फिर हिंदी या अंग्रेज़ी में प्रश्न पूछें। माइक बटन दबाकर बोल भी सकते हैं। सभी बातचीत स्वचालित रूप से सहेजी जाती है।'
    },
    'धन्यवाद': {
        'ui_markdown': '😊 **आपका स्वागत है!** क्या कोई और सहायता चाहिए?',
        'voice_prose': 'आपका स्वागत है! क्या कोई और सहायता चाहिए?'
    },
}

async def check_cache(
    query: str,
    user_id: str | None = None,
    language: str = 'en',
    file_id: int | None = None,
    document_id: str | None = None
) -> dict | None:
    """
    Checks static cache (in-memory) first, then falls back to Redis query cache.
    Returns response dict or None.
    """
    normalized = query.strip().lower()
    
    # 1. Local static cache check (instant)
    static_hit = STATIC_CACHE.get(normalized)
    if static_hit:
        return static_hit

    # 2. Redis exact cache check
    try:
        redis = get_redis()
        # Scope the cache key with context attributes
        file_part = str(file_id) if file_id is not None else 'none'
        doc_part = str(document_id) if document_id is not None else 'none'
        user_part = str(user_id) if user_id is not None else 'none'
        key = f"query_cache:{user_part}:{language}:{file_part}:{doc_part}:{normalized}"
        
        cached_data = await redis.get(key)
        if cached_data:
            logger.info(f"Redis cache hit for query: {normalized} (user: {user_part}, lang: {language}, file: {file_part}, doc: {doc_part})")
            return json.loads(cached_data)
    except Exception as e:
        logger.error(f"Redis cache lookup error: {e}")
        
    return None

async def set_cache(
    query: str,
    response_data: dict,
    user_id: str | None = None,
    language: str = 'en',
    file_id: int | None = None,
    document_id: str | None = None,
    ttl: int = 86400
) -> None:
    """
    Saves a query response to Redis with a TTL (Time-To-Live).
    Default TTL is 1 day (86400 seconds).
    """
    normalized = query.strip().lower()
    try:
        redis = get_redis()
        # Scope the cache key with context attributes
        file_part = str(file_id) if file_id is not None else 'none'
        doc_part = str(document_id) if document_id is not None else 'none'
        user_part = str(user_id) if user_id is not None else 'none'
        key = f"query_cache:{user_part}:{language}:{file_part}:{doc_part}:{normalized}"
        
        cache_payload = {
            'ui_markdown': response_data.get('ui_markdown'),
            'voice_prose': response_data.get('voice_prose'),
            'route': response_data.get('route', 'llm_core'),
            'sources': response_data.get('sources', [])
        }
        await redis.setex(key, ttl, json.dumps(cache_payload))
        logger.info(f"Cached response in Redis for query: {normalized} (user: {user_part}, lang: {language}, file: {file_part}, doc: {doc_part})")
    except Exception as e:
        logger.error(f"Failed to set Redis cache: {e}")
