import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select
from app.db.engine import get_session
from app.db.models import ChatSession, ChatMessage
from app.core.auth import get_current_user
from app.rag.query import process_query
from app.core.limiter import rate_limiter
from datetime import datetime

router = APIRouter(tags=['chat'])


class ChatRequest(BaseModel):
    question: str
    session_id: str
    target_language: str = 'en'
    is_voice: bool = False
    file_id: int | None = None
    document_id: str | None = None


@router.post('/chat')
async def chat(
    request: ChatRequest,
    req: Request,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session),
    _rate_limit = Depends(rate_limiter)
):
    """
    Send a question to the RAG system within a session (Asynchronous).
    Returns ui_markdown (rich text for UI) and voice_prose (TTS-ready plain text).
    """
    # Validate session belongs to this user (offloaded to threadpool)
    def validate_session():
        return db.exec(
            select(ChatSession).where(
                ChatSession.id == request.session_id,
                ChatSession.user_id == user_id
            )
        ).first()

    session = await asyncio.to_thread(validate_session)
    if not session:
        raise HTTPException(status_code=404, detail='Session not found')

    # Save user message to DB
    user_msg = ChatMessage(
        session_id=request.session_id,
        role='user',
        ui_markdown=request.question,
        voice_prose=request.question,
        is_voice_turn=request.is_voice
    )

    def save_user_msg_and_title():
        db.add(user_msg)
        
        # Auto-title session from the first user message
        existing_count = len(
            db.exec(
                select(ChatMessage).where(ChatMessage.session_id == request.session_id)
            ).all()
        )
        if existing_count == 0 and session.title == 'New Conversation':
            truncated = request.question[:50]
            session.title = truncated + ('...' if len(request.question) > 50 else '')
            session.updated_at = datetime.utcnow()
            db.add(session)
        db.commit()

    await asyncio.to_thread(save_user_msg_and_title)

    # Process query (async RAG)
    result = await process_query(
        query=request.question,
        user_id=user_id,
        language=request.target_language,
        file_id=request.file_id,
        document_id=request.document_id,
        db=db
    )

    # Save assistant response to DB
    assistant_msg = ChatMessage(
        session_id=request.session_id,
        role='assistant',
        ui_markdown=result['ui_markdown'],
        voice_prose=result['voice_prose'],
        is_voice_turn=request.is_voice
    )

    def save_assistant_msg():
        db.add(assistant_msg)
        # Bump session updated_at
        session.updated_at = datetime.utcnow()
        db.add(session)
        db.commit()

    await asyncio.to_thread(save_assistant_msg)

    return {
        'ui_markdown': result['ui_markdown'],
        'voice_prose': result['voice_prose'],
        'route_used': result.get('route', 'unknown'),
        'latency_ms': result.get('latency_ms', 0),
        'sources': result.get('sources', []),
        'is_voice': request.is_voice
    }