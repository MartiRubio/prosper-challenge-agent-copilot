"""Saved versions of an agent: one full snapshot per save."""

from datetime import datetime

from infrastructure.agent_files import UnknownAgent, agent_path
from infrastructure.agent_history import list_snapshots, read_snapshot


class UnknownVersion(LookupError):
    """No snapshot with this id."""


def list_versions(agent_id: str) -> list[dict]:
    if not agent_path(agent_id).is_file():
        raise UnknownAgent(agent_id)
    return [
        {
            "id": version_id,
            "saved_at": _iso(version_id),
            "name": document.get("name") or agent_id,
            "steps": len(document.get("nodes") or []),
        }
        for version_id, document in list_snapshots(agent_id)
    ]


def get_version(agent_id: str, version_id: str) -> dict:
    document = read_snapshot(agent_id, version_id)
    if document is None:
        raise UnknownVersion(version_id)
    return document


def _iso(version_id: str) -> str:
    try:
        return datetime.strptime(version_id, "%Y%m%dT%H%M%S%fZ").strftime("%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return ""
