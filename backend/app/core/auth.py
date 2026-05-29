from fastapi import Header, HTTPException, Depends
from sqlmodel import Session, select
from app.db.engine import get_session
from app.db.models import User


async def get_current_user(
    x_user_id: str = Header(..., description='User identifier'),
    db: Session = Depends(get_session)
) -> str:
    if not x_user_id or not x_user_id.strip():
        raise HTTPException(status_code=401, detail='X-User-ID header is required')

    # Auto-create user if first time
    user = db.exec(select(User).where(User.user_id == x_user_id)).first()
    if not user:
        user = User(user_id=x_user_id)
        db.add(user)
        db.commit()

    return x_user_id
