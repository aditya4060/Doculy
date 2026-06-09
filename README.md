# Doculy

Doculy is a simple single-user RAG web app for uploading PDF or text documents and asking grounded questions about them. Answers are generated from retrieved document chunks and returned with source snippets and page references when available.

## Features

- Upload PDF and TXT files.
- Extract and chunk document text.
- Generate Gemini embeddings and store them in PostgreSQL with pgvector.
- Ask questions about one selected document.
- Retrieve relevant chunks and generate grounded answers.
- Cache document reads, repeated retrievals, and repeated final answers with Redis.
- Save simple per-document chat messages.
- View source snippets below assistant answers.
- Run locally with Docker Compose.

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: FastAPI, SQLAlchemy
- Database: PostgreSQL with pgvector
- Cache: Redis
- Parsing: PyMuPDF for PDFs, standard text reading for TXT
- AI provider: Gemini via environment variables
- Local runtime: Docker Compose

## Local Setup

1. Copy environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Add your Gemini API key to `backend/.env`:

```bash
GEMINI_API_KEY=your_key_here
```

3. Start the app:

```bash
docker compose up --build
```

4. Open the app:

- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/health

If `GEMINI_API_KEY` is missing, uploads are accepted but document processing fails with a clear status message.

## Environment Variables

Backend:

- `DATABASE_URL`: PostgreSQL connection string.
- `GEMINI_API_KEY`: Gemini API key for embeddings and chat.
- `GEMINI_EMBEDDING_MODEL`: Embedding model, default `gemini-embedding-001`.
- `GEMINI_CHAT_MODEL`: Chat model, default `gemini-2.5-flash`.
- `EMBEDDING_DIMENSIONS`: pgvector column dimensions, default `1536`.
- `UPLOAD_DIR`: Local file upload directory.
- `MAX_UPLOAD_SIZE_MB`: Upload size limit.
- `FRONTEND_ORIGIN`: Allowed browser origin for CORS.
- `REDIS_URL`: Redis connection string, default `redis://redis:6379/0`.
- `DOCUMENT_CACHE_TTL_SECONDS`: TTL for document list/detail cache, default `60`.
- `RAG_CACHE_TTL_SECONDS`: TTL for retrieval and final-answer cache, default `1800`.

Frontend:

- `NEXT_PUBLIC_API_BASE_URL`: Backend URL used by the browser.

## API Overview

- `GET /health`
- `POST /documents/upload`
- `GET /documents`
- `GET /documents/{document_id}`
- `DELETE /documents/{document_id}`
- `POST /chat/{document_id}`
- `GET /chat/{document_id}/messages`

Chat request:

```json
{
  "question": "What is this document about?"
}
```

Chat response:

```json
{
  "answer": "Grounded answer here",
  "sources": [
    {
      "page_number": 2,
      "chunk_index": 4,
      "content": "Relevant source snippet..."
    }
  ]
}
```

## RAG Flow

1. The user uploads a PDF or TXT file.
2. The backend saves the file locally.
3. Text is extracted, split into overlapping chunks, and embedded.
4. Chunks and embeddings are stored in PostgreSQL using pgvector.
5. The user asks a question about a ready document.
6. Redis is checked for a cached final answer for that document/question pair.
7. If there is no answer cache hit, Redis is checked for cached retrieved chunks.
8. On a retrieval miss, the question is embedded and compared against that document's chunks.
9. The top chunks are cached, inserted into a grounded prompt, and sent to the LLM.
10. The answer and sources are cached and saved as chat messages.

## Redis Cache

Redis is used as a best-effort cache. If Redis is unavailable, the backend falls back to PostgreSQL and Gemini calls.

- `documents:list`: cached document list.
- `documents:detail:{document_id}`: cached document detail.
- `retrieval:{document_id}:{question_hash}`: cached retrieved source chunks.
- `answer:{document_id}:{question_hash}`: cached final answer and source snippets.

Document caches are invalidated when a document is uploaded, processed, or deleted. Retrieval and answer caches are invalidated when the associated document is deleted or reprocessed.
