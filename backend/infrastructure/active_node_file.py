"""Read and write the node a live call is in."""

import json
from pathlib import Path

from infrastructure.agent_files import agent_path

RUNTIME_DIR = Path(__file__).resolve().parent.parent / "runtime"


def write_active_node(agent_id: str, node_name: str) -> None:
    path = _status_path(agent_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"node": node_name}) + "\n")


def read_active_node(agent_id: str) -> str | None:
    path = _status_path(agent_id)
    if not path.is_file():
        return None
    node = json.loads(path.read_text()).get("node")
    if not isinstance(node, str):
        return None
    return node


def clear_active_node(agent_id: str) -> None:
    path = _status_path(agent_id)
    if path.is_file():
        path.unlink()


def _status_path(agent_id: str) -> Path:
    agent_path(agent_id)
    return RUNTIME_DIR / f"{agent_id}.json"
