import hashlib
import uuid
from types import SimpleNamespace

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.cache import get_json, set_json
from app.config import get_settings
from app.database import get_db
from app.embeddings import MissingProviderKeyError
from app.llm import answer_question
from app.models import ChatMessage, Document
from app.retriever import retrieve_chunks
from app.schemas import ChatMessageRead, ChatRequest, ChatResponse, SourceSnippet

router = APIRouter(prefix="/chat", tags=["chat"])


def _question_hash(question: str) -> str:
    normalized = " ".join(question.lower().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _retrieval_cache_key(document_id: uuid.UUID, question: str) -> str:
    return f"retrieval:{document_id}:{_question_hash(question)}"


def _answer_cache_key(document_id: uuid.UUID, question: str) -> str:
    return f"answer:{document_id}:{_question_hash(question)}"


def _source_from_chunk(chunk: object) -> dict:
    return {
        "page_number": getattr(chunk, "page_number"),
        "chunk_index": getattr(chunk, "chunk_index"),
        "content": getattr(chunk, "content"),
    }


def _response_sources(sources: list[dict]) -> list[SourceSnippet]:
    return [
        SourceSnippet(
            page_number=source["page_number"],
            chunk_index=source["chunk_index"],
            content=source["content"][:700],
        )
        for source in sources
    ]


@router.post("/{document_id}", response_model=ChatResponse)
def ask_question(document_id: uuid.UUID, request: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question cannot be empty.")

    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    if document.status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document is not ready for chat. Current status: {document.status}.",
        )

    settings = get_settings()
    answer_key = _answer_cache_key(document_id, question)
    cached_answer = get_json(answer_key)
    if isinstance(cached_answer, dict):
        answer = str(cached_answer["answer"])
        sources = [SourceSnippet.model_validate(source) for source in cached_answer["sources"]]
        _save_chat_messages(db, document_id, question, answer, sources)
        return ChatResponse(answer=answer, sources=sources)

    try:
        retrieval_key = _retrieval_cache_key(document_id, question)
        cached_retrieval = get_json(retrieval_key)
        if isinstance(cached_retrieval, list):
            source_payload = cached_retrieval
            chunks = [SimpleNamespace(**source) for source in source_payload]
        else:
            chunks = retrieve_chunks(db, document_id, question)
            source_payload = [_source_from_chunk(chunk) for chunk in chunks]
            set_json(retrieval_key, source_payload, settings.rag_cache_ttl_seconds)

        sources = _response_sources(source_payload)
        answer = answer_question(question, chunks)
        set_json(
            answer_key,
            {"answer": answer, "sources": [source.model_dump() for source in sources]},
            settings.rag_cache_ttl_seconds,
        )
    except MissingProviderKeyError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    _save_chat_messages(db, document_id, question, answer, sources)
    return ChatResponse(answer=answer, sources=sources)


def _save_chat_messages(
    db: Session,
    document_id: uuid.UUID,
    question: str,
    answer: str,
    sources: list[SourceSnippet],
) -> None:
    db.add(ChatMessage(document_id=document_id, role="user", content=question))
    db.add(
        ChatMessage(
            document_id=document_id,
            role="assistant",
            content=answer,
            sources_json=[source.model_dump() for source in sources],
        )
    )
    db.commit()


@router.get("/{document_id}/messages", response_model=list[ChatMessageRead])
def list_messages(document_id: uuid.UUID, db: Session = Depends(get_db)) -> list[ChatMessage]:
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return list(
        db.query(ChatMessage)
        .filter(ChatMessage.document_id == document_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
