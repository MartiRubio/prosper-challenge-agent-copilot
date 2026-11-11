"""Turn an attached guideline file into plain text for the copilot."""

import base64
import binascii
import io

from pypdf import PdfReader

_TEXT_TYPES = (".txt", ".md", ".markdown", ".csv")
_LIMIT = 40_000
_MAX_BYTES = 10 * 1024 * 1024


def extract_attachment(name: object, data: object) -> dict:
    if not isinstance(name, str) or not name.strip():
        raise ValueError("The file needs a name.")
    if not isinstance(data, str) or not data:
        raise ValueError("The file is empty.")
    try:
        raw = base64.b64decode(data, validate=True)
    except (binascii.Error, ValueError) as error:
        raise ValueError("The file could not be read.") from error
    if len(raw) > _MAX_BYTES:
        raise ValueError("The file is larger than 10 MB.")
    lower = name.lower()
    if lower.endswith(".pdf"):
        text = _pdf_text(raw)
    elif lower.endswith(_TEXT_TYPES):
        text = raw.decode("utf-8", errors="replace")
    else:
        raise ValueError("Attach a .txt, .md, or .pdf file.")
    text = text.strip()
    if not text:
        raise ValueError("No text was found in that file.")
    return {
        "name": name.strip(),
        "text": text[:_LIMIT],
        "truncated": len(text) > _LIMIT,
        "characters": min(len(text), _LIMIT),
    }


def _pdf_text(raw: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(raw))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as error:
        raise ValueError("That PDF could not be read.") from error
