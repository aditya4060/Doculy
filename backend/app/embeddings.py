from google import genai
from google.genai import types

from app.config import get_settings


class MissingProviderKeyError(RuntimeError):
    pass


def _client() -> genai.Client:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise MissingProviderKeyError(
            "GEMINI_API_KEY is not configured. Add it to backend/.env to process documents."
        )
    return genai.Client(api_key=settings.gemini_api_key)


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    settings = get_settings()
    client = _client()
    response = client.models.embed_content(
        model=settings.gemini_embedding_model,
        contents=texts,
        config=types.EmbedContentConfig(output_dimensionality=settings.embedding_dimensions),
    )
    return [embedding.values for embedding in response.embeddings or []]


def embed_query(text: str) -> list[float]:
    return embed_texts([text])[0]
