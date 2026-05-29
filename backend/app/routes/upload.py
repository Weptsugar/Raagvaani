from fastapi import APIRouter, UploadFile, File, Depends, BackgroundTasks, HTTPException
from sqlmodel import Session
from app.db.engine import get_session
from app.db.models import UploadedFile
from app.core.auth import get_current_user
from app.core.storage import save_file
from app.rag.ingest import ingest_file

router = APIRouter(tags=['upload'])

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt', 'xlsx', 'csv'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


def run_ingestion(
    file_path: str,
    user_id: str,
    original_name: str,
    file_type: str,
    file_id: int,
    document_id: str
):
    """Background task: ingest a file into Qdrant and update DB status."""
    from app.db.engine import engine
    from sqlmodel import Session
    from app.db.models import UploadedFile

    try:
        ingest_file(file_path, user_id, original_name, file_type, file_id, document_id)
        with Session(engine) as db:
            record = db.get(UploadedFile, file_id)
            if record:
                record.status = 'ready'
                db.add(record)
                db.commit()
    except Exception as e:
        with Session(engine) as db:
            record = db.get(UploadedFile, file_id)
            if record:
                record.status = 'error'
                db.add(record)
                db.commit()


@router.post('/upload')
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """
    Upload a document for ingestion.
    Supported formats: PDF, DOCX, TXT, XLSX, CSV (max 50 MB).
    Ingestion runs in the background — poll /files to check status.
    """
    # Validate extension
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f'File type .{ext} not supported. Allowed: {sorted(ALLOWED_EXTENSIONS)}'
        )

    # Save file to disk
    file_path, safe_name = await save_file(file, user_id)

    # Clean up any existing upload with same filename for this user to avoid duplicates
    from sqlmodel import select
    from app.rag.ingest import delete_file_vectors
    existing_records = db.exec(
        select(UploadedFile).where(
            UploadedFile.user_id == user_id,
            UploadedFile.original_name == file.filename
        )
    ).all()
    for old_rec in existing_records:
        delete_file_vectors(user_id, old_rec.id, old_rec.original_name, old_rec.document_id)
        db.delete(old_rec)
    db.commit()

    # Create DB record with status 'processing'
    record = UploadedFile(
        user_id=user_id,
        filename=safe_name,
        original_name=file.filename,
        file_type=ext,
        status='processing'
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Queue background ingestion task
    background_tasks.add_task(
        run_ingestion,
        file_path,
        user_id,
        file.filename,
        ext,
        record.id,
        record.document_id
    )

    return {
        'message': 'File uploaded successfully. Processing in background.',
        'file_id': record.id,
        'document_id': record.document_id,
        'filename': file.filename,
        'status': 'processing'
    }