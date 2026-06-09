import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.cache import cached, delete_keys, delete_pattern
from app.chunker import chunk_pages
from app.config import get_settings
from app.database import get_db
from app.embeddings import MissingProviderKeyError, embed_texts
from app.file_parser import extract_text
from app.models import Document, DocumentChunk
from app.schemas import DocumentRead

router = APIRouter(prefix="/documents", tags=["documents"])


def _document_cache_key(document_id: uuid.UUID) -> str:
    return f"documents:detail:{document_id}"


def _invalidate_document_cache(document_id: uuid.UUID | None = None) -> None:
    delete_keys("documents:list")
    if document_id:
        delete_keys(_document_cache_key(document_id))
        delete_pattern(f"retrieval:{document_id}:*")
        delete_pattern(f"answer:{document_id}:*")


def _file_type(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return "pdf"
    if suffix == ".txt":
        return "txt"
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Only PDF and TXT files are supported.",
    )


def _process_document(db: Session, document: Document) -> None:
    try:
        pages = extract_text(document.file_path, document.file_type)
        chunks = chunk_pages(pages)
        if not chunks:
            raise ValueError("No readable text was found in the uploaded document.")

        vectors = embed_texts([chunk["content"] for chunk in chunks])
        for chunk, vector in zip(chunks, vectors, strict=True):
            db.add(
                DocumentChunk(
                    document_id=document.id,
                    chunk_index=chunk["chunk_index"],
                    page_number=chunk["page_number"],
                    content=chunk["content"],
                    embedding=vector,
                )
            )

        document.status = "ready"
        document.error_message = None
    except MissingProviderKeyError as exc:
        document.status = "failed"
        document.error_message = str(exc)
    except Exception as exc:
        document.status = "failed"
        document.error_message = f"Document processing failed: {exc}"
    finally:
        db.commit()
        db.refresh(document)
        _invalidate_document_cache(document.id)


@router.post("/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)) -> Document:
    settings = get_settings()
    original_filename = file.filename or "upload"
    file_type = _file_type(original_filename)
    content = file.file.read()
    max_size = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File is too large. Maximum size is {settings.max_upload_size_mb} MB.",
        )

    stored_filename = f"{uuid.uuid4()}.{file_type}"
    destination = settings.upload_path / stored_filename
    with destination.open("wb") as output:
        output.write(content)

    document = Document(
        filename=stored_filename,
        original_filename=original_filename,
        file_type=file_type,
        file_path=str(destination),
        status="processing",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    _process_document(db, document)
    return document


@router.get("", response_model=list[DocumentRead])
def list_documents(db: Session = Depends(get_db)) -> list[dict]:
    settings = get_settings()

    def load_documents() -> list[dict]:
        documents = list(db.query(Document).order_by(Document.created_at.desc()).all())
        return [DocumentRead.model_validate(document).model_dump(mode="json") for document in documents]

    return cached("documents:list", settings.document_cache_ttl_seconds, load_documents)


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(document_id: uuid.UUID, db: Session = Depends(get_db)) -> dict:
    settings = get_settings()

    def load_document() -> dict:
        document = db.get(Document, document_id)
        if not document:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
        return DocumentRead.model_validate(document).model_dump(mode="json")

    return cached(_document_cache_key(document_id), settings.document_cache_ttl_seconds, load_document)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    document = db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    path = Path(document.file_path)
    db.delete(document)
    db.commit()
    _invalidate_document_cache(document_id)
    if path.exists():
        path.unlink()
