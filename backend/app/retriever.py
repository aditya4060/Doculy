import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.embeddings import embed_query
from app.models import DocumentChunk


def retrieve_chunks(db: Session, document_id: uuid.UUID, question: str, limit: int = 5) -> list[DocumentChunk]:
    query_embedding = embed_query(question)
    statement = (
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.embedding.cosine_distance(query_embedding))
        .limit(limit)
    )
    return list(db.scalars(statement).all())
