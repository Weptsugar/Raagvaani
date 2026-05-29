from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db.engine import get_session
from app.db.models import UploadedFile
from app.core.auth import get_current_user
from app.core.storage import delete_file as delete_disk_file
from app.rag.ingest import delete_file_vectors

router = APIRouter(prefix='/files', tags=['files'])


@router.get('')
def list_files(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """List all uploaded files for the authenticated user, newest first."""
    files = db.exec(
        select(UploadedFile)
        .where(UploadedFile.user_id == user_id)
        .order_by(UploadedFile.created_at.desc())
    ).all()
    return [
        {
            'id': f.id,
            'document_id': f.document_id,
            'original_name': f.original_name,
            'file_type': f.file_type,
            'status': f.status,
            'created_at': f.created_at
        }
        for f in files
    ]


@router.delete('/{file_id}')
def delete_file(
    file_id: int,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_session)
):
    """Delete an uploaded file (metadata, disk file, and Qdrant vectors)."""
    record = db.exec(
        select(UploadedFile).where(
            UploadedFile.id == file_id,
            UploadedFile.user_id == user_id
        )
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail='File not found')

    # 1. Delete vectors from Qdrant
    delete_file_vectors(user_id, file_id, record.original_name, record.document_id)

    # 2. Delete file from disk
    try:
        delete_disk_file(record.filename)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to delete disk file {record.filename}: {e}")

    # 3. Delete from DB
    db.delete(record)
    db.commit()

    return {'message': 'File deleted successfully'}
