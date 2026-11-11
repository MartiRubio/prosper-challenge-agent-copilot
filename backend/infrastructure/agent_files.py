"""Read and write agents. Each agent has its own folder under data/agents/."""

import json
import re
import shutil
from pathlib import Path

from infrastructure.data_dir import AGENTS_DIR

_AGENT_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")


class AgentFileError(Exception):
    """Base error for agent file access."""


class InvalidAgentId(AgentFileError):
    """The id is not a safe folder name."""


class UnknownAgent(AgentFileError):
    """No agent exists with this id."""


def agent_dir(agent_id: str) -> Path:
    """The agent's folder: its document, calls, checks and history."""
    if not isinstance(agent_id, str) or not _AGENT_ID.match(agent_id):
        raise InvalidAgentId(agent_id)
    path = (AGENTS_DIR / agent_id).resolve()
    if path.parent != AGENTS_DIR.resolve():
        raise InvalidAgentId(agent_id)
    return path


def agent_path(agent_id: str) -> Path:
    return agent_dir(agent_id) / "agent.json"


def agent_exists(agent_id: str) -> bool:
    return agent_path(agent_id).is_file()


def list_ids() -> list[str]:
    if not AGENTS_DIR.is_dir():
        return []
    return sorted(
        path.name
        for path in AGENTS_DIR.iterdir()
        if _AGENT_ID.match(path.name) and (path / "agent.json").is_file()
    )


def read_document(agent_id: str) -> dict:
    path = agent_path(agent_id)
    if not path.is_file():
        raise UnknownAgent(agent_id)
    return json.loads(path.read_text())


def write_document(agent_id: str, document: dict) -> None:
    path = agent_path(agent_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(document, indent=2) + "\n")


def delete_agent_dir(agent_id: str) -> None:
    """The agent and everything recorded about it: calls, checks, history."""
    folder = agent_dir(agent_id)
    if not (folder / "agent.json").is_file():
        raise UnknownAgent(agent_id)
    shutil.rmtree(folder)
