from pathlib import Path

import fitz


def extract_text(file_path: str, file_type: str) -> list[dict]:
    path = Path(file_path)
    if file_type == "txt":
        text = path.read_text(encoding="utf-8", errors="ignore")
        return [{"page_number": None, "text": text}]

    if file_type == "pdf":
        pages: list[dict] = []
        with fitz.open(path) as doc:
            for index, page in enumerate(doc, start=1):
                pages.append({"page_number": index, "text": page.get_text().strip()})
        return pages

    raise ValueError("Unsupported file type")
