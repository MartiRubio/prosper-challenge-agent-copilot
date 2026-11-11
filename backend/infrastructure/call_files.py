"""Call transcripts and their checks on disk.

Sample calls ship with the repo under sample_calls/. Test calls recorded by the
voice runner, and the copilot's check of each call, go under logs/, which git
ignores, so a demo never dirties the tree.
"""

import json
from pathlib import Path

from infrastructure.agent_files import agent_path

_BACKEND = Path(__file__).resolve().parent.parent
SAMPLE_DIR = _BACKEND / "sample_calls"
RECORDED_DIR = _BACKEND / "logs" / "calls"
CHECKS_DIR = _BACKEND / "logs" / "call_checks"


def read_calls(agent_id: str) -> list[dict]:
    """Sample calls stand in for production; anything the voice runner recorded is a test call."""
    agent_path(agent_id)
    samples = [{"source": "production", **call} for call in _read_list(SAMPLE_DIR / f"{agent_id}.json")]
    recorded = [{**call, "source": "test"} for call in _read_list(RECORDED_DIR / f"{agent_id}.json")]
    return [call for call in samples + recorded if call.get("agent_id") == agent_id]


def find_call(agent_id: str, call_id: str) -> dict | None:
    return next((call for call in read_calls(agent_id) if call.get("id") == call_id), None)


def append_recorded(agent_id: str, call: dict) -> Path:
    path = RECORDED_DIR / f"{agent_path(agent_id).stem}.json"
    calls = _read_list(path)
    calls.append(call)
    _write(path, calls)
    return path


def read_checks(agent_id: str) -> dict[str, dict]:
    path = CHECKS_DIR / f"{agent_path(agent_id).stem}.json"
    data = _read_json(path)
    return data if isinstance(data, dict) else {}


def write_check(agent_id: str, call_id: str, check: dict) -> None:
    checks = read_checks(agent_id)
    checks[call_id] = check
    _write(CHECKS_DIR / f"{agent_path(agent_id).stem}.json", checks)


def _read_list(path: Path) -> list[dict]:
    data = _read_json(path)
    if not isinstance(data, list):
        return []
    return [item for item in data if isinstance(item, dict)]


def _read_json(path: Path) -> object:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return None


def _write(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")
