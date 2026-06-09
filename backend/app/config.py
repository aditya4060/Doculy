from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://doculy:doculy@postgres:5432/doculy"
    gemini_api_key: str | None = None
    gemini_embedding_model: str = "gemini-embedding-001"
    gemini_chat_model: str = "gemini-2.5-flash"
    embedding_dimensions: int = 1536
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 10
    frontend_origin: str = "http://localhost:3000"
    redis_url: str = "redis://redis:6379/0"
    document_cache_ttl_seconds: int = 60
    rag_cache_ttl_seconds: int = 1800

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def upload_path(self) -> Path:
        path = Path(self.upload_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()
