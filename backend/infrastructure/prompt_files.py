"""Model prompts, read from data/prompts/<name>.md.

This is the prompt store's file adapter. A hosted prompt manager such as
Langfuse would be a second adapter with the same `get_prompt(name)`: it returns
the text and a version, and the version is logged with every answer, so any
answer can be traced to the exact prompt that produced it.
"""

import hashlib
from dataclasses import dataclass

from infrastructure.data_dir import PROMPTS_DIR


@dataclass(frozen=True)
class Prompt:
    name: str
    text: str
    version: str


def get_prompt(name: str) -> Prompt:
    path = PROMPTS_DIR / f"{name}.md"
    if not path.is_file():
        raise LookupError(f"No prompt named '{name}'.")
    text = path.read_text().rstrip("\n")
    # A file has no version number; a hash of its text changes whenever the prompt does.
    version = hashlib.sha256(text.encode()).hexdigest()[:8]
    return Prompt(name=name, text=text, version=version)
