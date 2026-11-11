"""Saved versions of an agent: one full snapshot per save, numbered from the first.

Each version also counts the calls made while it was the saved agent, so the
version that was live when calls went wrong is easy to find.
"""

from datetime import datetime

from infrastructure.agent_files import UnknownAgent, agent_path
from infrastructure.agent_history import list_snapshots, read_snapshot
from infrastructure.call_files import read_calls


class UnknownVersion(LookupError):
    """No snapshot with this id."""


def list_versions(agent_id: str) -> list[dict]:
    if not agent_path(agent_id).is_file():
        raise UnknownAgent(agent_id)
    snapshots = list(reversed(list_snapshots(agent_id)))  # oldest first
    saved = [_iso(version_id) for version_id, _ in snapshots]
    counts = [0] * len(snapshots)
    for call in read_calls(agent_id):
        started = call.get("started_at") or ""
        # A call belongs to the last version saved before it; older calls to the first.
        index = 0
        for position, saved_at in enumerate(saved):
            if saved_at and saved_at <= started:
                index = position
        if counts:
            counts[index] += 1
    versions = [
        {
            "id": version_id,
            "number": position + 1,
            "saved_at": saved[position],
            "name": document.get("name") or agent_id,
            "steps": len(document.get("nodes") or []),
            "calls": counts[position],
            "current": position == len(snapshots) - 1,
        }
        for position, (version_id, document) in enumerate(snapshots)
    ]
    return list(reversed(versions))


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
