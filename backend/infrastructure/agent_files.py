"""Read and write agent JSON files under backend/agents/."""

import json
import re
from pathlib import Path

AGENTS_DIR = Path(__file__).resolve().parent.parent / "agents"

_AGENT_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")


class AgentFileError(Exception):
    """Base error for agent file access."""


class InvalidAgentId(AgentFileError):
    """The id is not a safe filename stem."""


class UnknownAgent(AgentFileError):
    """No file exists for this id."""


def agent_path(agent_id: str) -> Path:
    if not _AGENT_ID.match(agent_id):
        raise InvalidAgentId(agent_id)
    path = (AGENTS_DIR / f"{agent_id}.json").resolve()
    if path.parent != AGENTS_DIR.resolve():
        raise InvalidAgentId(agent_id)
    return path


def list_ids() -> list[str]:
    if not AGENTS_DIR.is_dir():
        return []
    return sorted(
        path.stem
        for path in AGENTS_DIR.glob("*.json")
        if path.is_file() and _AGENT_ID.match(path.stem)
    )


def read_document(agent_id: str) -> dict:
    path = agent_path(agent_id)
    if not path.is_file():
        raise UnknownAgent(agent_id)
    return json.loads(path.read_text())
