from sqlmodel import create_engine, SQLModel, Session
from app.db.models import User, ChatSession, ChatMessage, UploadedFile  # noqa: F401

from sqlalchemy import event

DATABASE_URL = 'sqlite:///./ragvaani.db'
engine = create_engine(
    DATABASE_URL, 
    echo=False, 
    connect_args={"timeout": 30, "check_same_thread": False}
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.execute("PRAGMA busy_timeout=30000")
    cursor.close()


def create_db():
    SQLModel.metadata.create_all(engine)
        # Check if document_id exists in uploadedfile, if not, add it
    from sqlalchemy import text
    with Session(engine) as session:
        try:
            session.execute(text("SELECT document_id FROM uploadedfile LIMIT 1"))
        except Exception:
            try:
                session.execute(text("ALTER TABLE uploadedfile ADD COLUMN document_id VARCHAR"))
                session.commit()
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to add document_id column: {e}")
        
        # Populate any NULL document_ids with unique UUIDs
        try:
            null_rows = session.execute(text("SELECT id FROM uploadedfile WHERE document_id IS NULL")).all()
            if null_rows:
                import uuid
                for row in null_rows:
                    session.execute(
                        text("UPDATE uploadedfile SET document_id = :doc_id WHERE id = :id"),
                        {"doc_id": str(uuid.uuid4()), "id": row[0]}
                    )
                session.commit()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to populate NULL document_ids: {e}")


def get_session():
    with Session(engine) as session:
        yield session
