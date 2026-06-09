def chunk_pages(
    pages: list[dict], chunk_size: int = 1200, overlap: int = 200
) -> list[dict]:
    chunks: list[dict] = []
    chunk_index = 0

    for page in pages:
        text = " ".join(page["text"].split())
        if not text:
            continue

        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            content = text[start:end].strip()
            if content:
                chunks.append(
                    {
                        "chunk_index": chunk_index,
                        "page_number": page["page_number"],
                        "content": content,
                    }
                )
                chunk_index += 1
            if end == len(text):
                break
            start = max(end - overlap, start + 1)

    return chunks
