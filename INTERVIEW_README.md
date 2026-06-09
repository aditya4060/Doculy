# Doculy Interview Notes

## System Design

Doculy is a single-user RAG web application for uploading PDF or TXT documents and asking grounded questions about them. The goal was to build a compact but complete prototype that shows the core parts of a document question-answering system without turning it into a large production platform.

The system has four main services:

- Next.js frontend for upload, document listing, and chat UI.
- FastAPI backend for document processing, retrieval, chat, and API orchestration.
- PostgreSQL with pgvector for document metadata, chat messages, chunks, and vector similarity search.
- Redis as a best-effort cache for repeated document reads, retrieval results, and final answers.

The ingestion flow is:

```text
Upload document
  -> validate file type and size
  -> save file locally
  -> create document record
  -> extract text
  -> split text into overlapping chunks
  -> generate embeddings
  -> store chunks and vectors in PostgreSQL
  -> mark document as ready
```

The query flow is:

```text
Ask question
  -> validate document is ready
  -> check Redis for cached answer
  -> check Redis for cached retrieval results
  -> embed the question if needed
  -> retrieve top matching chunks with pgvector
  -> build a grounded prompt
  -> call Gemini chat model
  -> return answer with source snippets
  -> save chat messages
```

## What Was Achieved

Doculy implements the complete core RAG path end to end:

- Users can upload PDF and TXT files.
- The backend extracts readable text from documents.
- Text is split into chunks with overlap.
- Chunks are embedded using Gemini embeddings.
- Embeddings are stored in PostgreSQL using pgvector.
- Users can ask questions against one selected document.
- The system retrieves relevant chunks using vector similarity search.
- Answers are generated from retrieved context only.
- Source snippets and page numbers are returned when available.
- Chat history is saved per document.
- Redis caches repeated document reads, retrieval results, and final answers.
- The project runs locally with Docker Compose.

The main achievement is that the app is not just a UI mock or isolated API. It connects document ingestion, vector search, LLM prompting, citations, persistence, and caching into one working flow.

## What I Might Add In The Future

I would add:

- Authentication and user accounts.
- Multi-user document isolation.
- Background workers for document processing.
- Object storage such as S3 or GCS for uploaded files.
- OCR support for scanned PDFs.
- Streaming chat responses.
- Multi-document chat.
- Hybrid search using both keyword search and vector search.
- Reranking for better retrieval quality.
- Automated integration tests for upload and chat flows.
- Observability with structured logs, metrics, tracing, and error reporting.
- Better evaluation for answer quality and citation accuracy.

The most important near-term improvement would be moving document processing out of the upload request. Uploads should create a document record and enqueue a job, while a worker handles parsing, chunking, embeddings, and status updates asynchronously.

## Scalability And Fit

Doculy is intentionally scoped as a single-user local prototype. For that scope, the architecture is a good fit because it is simple to run, easy to explain, and still demonstrates realistic RAG building blocks.

PostgreSQL with pgvector is a good fit at this stage because it keeps metadata and vectors in one database. That makes the system easier to operate than adding a separate vector database too early. As the chunk table grows, I would add vector indexes such as HNSW or IVFFlat and tune retrieval performance.

Redis is also a good fit here because LLM and embedding calls are expensive compared with normal database reads. Caching repeated retrievals and repeated final answers can reduce latency and provider cost. Redis is not a source of truth in this project; if it is unavailable, the backend can still fall back to PostgreSQL and model calls.

The main scalability limits are:

- Upload processing happens synchronously in the request cycle.
- Files are stored on the local backend filesystem.
- There is no authentication or tenant isolation.
- There is no queue or worker layer.
- There is no production observability.
- There are no database migrations yet.

To scale this beyond a demo, I would deploy the frontend and backend separately, use managed PostgreSQL with pgvector, use managed Redis, move files to object storage, add background workers, add auth, and add rate limiting and monitoring.

