"""
StorageService — local filesystem for MVP. Add S3StorageService and swap the
module-level singleton when object storage is needed.
"""
import uuid
import aiofiles
from abc import ABC, abstractmethod
from pathlib import Path
from fastapi import UploadFile
from app.config import get_settings

settings = get_settings()


class StorageService(ABC):
    @abstractmethod
    async def save(self, file: UploadFile, subfolder: str = "") -> tuple[str, int]:
        """Returns (storage_path, size_bytes)."""
        ...

    @abstractmethod
    async def delete(self, storage_path: str) -> None: ...

    @abstractmethod
    def public_url(self, storage_path: str) -> str: ...


class LocalStorageService(StorageService):
    def __init__(self) -> None:
        self._root = Path(settings.media_dir)
        self._root.mkdir(parents=True, exist_ok=True)

    async def save(self, file: UploadFile, subfolder: str = "") -> tuple[str, int]:
        dest_dir = self._root / subfolder
        dest_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{uuid.uuid4()}_{Path(file.filename or 'upload').name}"
        dest = dest_dir / filename
        content = await file.read()

        async with aiofiles.open(dest, "wb") as f:
            await f.write(content)

        relative = str(dest.relative_to(self._root))
        return relative, len(content)

    async def delete(self, storage_path: str) -> None:
        target = self._root / storage_path
        if target.exists():
            target.unlink()

    def public_url(self, storage_path: str) -> str:
        return f"/media/{storage_path}"


storage_service = LocalStorageService()
