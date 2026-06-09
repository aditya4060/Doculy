import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentRead(BaseModel):
    id: uuid.UUID
    filename: str
    original_filename: str
    file_type: str
    status: str
    error_message: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatRequest(BaseModel):
    question: str


class SourceSnippet(BaseModel):
    page_number: int | None
    chunk_index: int
    content: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceSnippet]


class ChatMessageRead(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    sources_json: list[dict] | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
