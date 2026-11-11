"""A full copy of an agent every time it is saved, under data/agents/<id>/history/."""

import json
from datetime import datetime, timezone
from pathlib import Path

from infrastructure.agent_files import agent_dir


def write_snapshot(agent_id: str, document: dict) -> str:
    folder = _folder(agent_id)
    folder.mkdir(parents=True, exist_ok=True)
    version_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    (folder / f"{version_id}.json").write_text(json.dumps(document, indent=2) + "\n")
    return version_id


def list_snapshots(agent_id: str) -> list[tuple[str, dict]]:
    folder = _folder(agent_id)
    if not folder.is_dir():
        return []
    snapshots = []
    for path in sorted(folder.glob("*.json"), reverse=True):
        try:
            snapshots.append((path.stem, json.loads(path.read_text())))
        except json.JSONDecodeError:
            continue
    return snapshots


def read_snapshot(agent_id: str, version_id: str) -> dict | None:
    if not version_id.replace("T", "").replace("Z", "").isdigit():
        return None
    path = _folder(agent_id) / f"{version_id}.json"
    if not path.is_file():
        return None
    return json.loads(path.read_text())


def _folder(agent_id: str) -> Path:
    return agent_dir(agent_id) / "history"
