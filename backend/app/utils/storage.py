import os
import shutil
from abc import ABC, abstractmethod
from typing import BinaryIO
from app.core.config import settings

class StorageBackend(ABC):
    @abstractmethod
    def save_file(self, file_obj: BinaryIO, relative_path: str) -> str:
        pass

    @abstractmethod
    def get_file_path(self, relative_path: str) -> str:
        pass

    @abstractmethod
    def delete_file(self, relative_path: str) -> bool:
        pass


class LocalStorage(StorageBackend):
    def __init__(self, base_dir: str = settings.STORAGE_DIR):
        self.base_dir = base_dir

    def save_file(self, file_obj: BinaryIO, relative_path: str) -> str:
        full_path = os.path.join(self.base_dir, relative_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as buffer:
            shutil.copyfileobj(file_obj, buffer)
        return full_path

    def get_file_path(self, relative_path: str) -> str:
        return os.path.join(self.base_dir, relative_path)

    def delete_file(self, relative_path: str) -> bool:
        full_path = os.path.join(self.base_dir, relative_path)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
                return True
            except OSError:
                return False
        return False

# Global storage instance
storage = LocalStorage()

