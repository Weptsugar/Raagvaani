from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.db.engine import get_session
from app.db.models import ChatSession, ChatMessage
from app.core.auth import get_current_user
from datetime import datetime
from typing import Optional

router = APIRouter(prefix='/sessions', tags=['sessions'])


class CreateSessionRequest(BaseModel):
    title: Optional[str] = 'New Conversation'


class RenameSessionRequest(BaseModel):
    title: str


@router.get('')
def list_sessions(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """List all sessions for the authenticated user, newest first."""
    sessions = db.exec(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc())
    ).all()
    return [
        {
            'id': s.id,
            'title': s.title,
            'created_at': s.created_at,
            'updated_at': s.updated_at
        }
        for s in sessions
    ]


@router.post('')
def create_session(
    body: CreateSessionRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Create a new chat session for the authenticated user."""
    session = ChatSession(
        user_id=user_id,
        title=body.title or 'New Conversation'
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        'id': session.id,
        'title': session.title,
        'created_at': session.created_at
    }


@router.get('/{session_id}/messages')
def get_messages(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Get all messages for a session (user must own it)."""
    session = db.exec(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id
        )
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail='Session not found')

    messages = db.exec(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    ).all()

    return [
        {
            'id': m.id,
            'role': m.role,
            'ui_markdown': m.ui_markdown,
            'voice_prose': m.voice_prose,
            'is_voice_turn': m.is_voice_turn,
            'created_at': m.created_at
        }
        for m in messages
    ]


@router.patch('/{session_id}/title')
def rename_session(
    session_id: str,
    body: RenameSessionRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Rename a session."""
    session = db.exec(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id
        )
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail='Session not found')

    session.title = body.title
    session.updated_at = datetime.utcnow()
    db.add(session)
    db.commit()
    return {'id': session.id, 'title': session.title}


@router.delete('/{session_id}')
def delete_session(
    session_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Delete a session and all its messages."""
    session = db.exec(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user_id
        )
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail='Session not found')

    # Delete all messages first (no cascade in SQLite by default)
    messages = db.exec(
        select(ChatMessage).where(ChatMessage.session_id == session_id)
    ).all()
    for msg in messages:
        db.delete(msg)

    db.delete(session)
    db.commit()
    return {'message': 'Session deleted'}
