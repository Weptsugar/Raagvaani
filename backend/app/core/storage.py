import os
import aiofiles
from fastapi import UploadFile

UPLOAD_DIR = 'uploads'
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def save_file(file: UploadFile, user_id: str) -> tuple[str, str]:
    """Save file to disk. Returns (file_path, safe_filename)."""
    safe_name = f"{user_id}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    return file_path, safe_name


def delete_file(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if os.path.exists(path):
        os.remove(path)
