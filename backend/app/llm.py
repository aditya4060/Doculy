from google import genai
from google.genai import types

from app.config import get_settings
from app.embeddings import MissingProviderKeyError
from app.models import DocumentChunk

NOT_ENOUGH_INFO = "I could not find enough information in the uploaded document to answer that."


def _client() -> genai.Client:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise MissingProviderKeyError(
            "GEMINI_API_KEY is not configured. Add it to backend/.env to ask questions."
        )
    return genai.Client(api_key=settings.gemini_api_key)


def answer_question(question: str, chunks: list[DocumentChunk]) -> str:
    settings = get_settings()
    context = "\n\n".join(
        f"Source {index + 1} | page {chunk.page_number or 'n/a'} | chunk {chunk.chunk_index}:\n{chunk.content}"
        for index, chunk in enumerate(chunks)
    )
    prompt = f"""You are a document question-answering assistant.

Answer the user's question using only the provided document context.
If the answer is not present in the context, say:
"{NOT_ENOUGH_INFO}"

Document context:
{context}

User question:
{question}

Return a clear answer. Do not invent facts outside the document."""

    client = _client()
    response = client.models.generate_content(
        model=settings.gemini_chat_model,
        contents=prompt,
        config=types.GenerateContentConfig(temperature=0.1),
    )
    return response.text or NOT_ENOUGH_INFO
