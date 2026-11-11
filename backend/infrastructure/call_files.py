"""Call transcripts and their checks, in each agent's folder.

sample_calls.json ships with the repo and stands in for production. Test calls
recorded by the voice runner, and simulated calls, go to calls/, one file per call, and the copilot's
check of each call to checks.json. Git ignores both, so a demo never dirties
the tree.
"""

import json
import os
import threading
from pathlib import Path

from infrastructure.agent_files import agent_dir

_checks_lock = threading.Lock()


def read_calls(agent_id: str) -> list[dict]:
    """Sample calls stand in for production; a recorded call is a test call unless it says it was simulated."""
    folder = agent_dir(agent_id)
    samples = [{"source": "production", **call} for call in _read_list(folder / "sample_calls.json")]
    recorded = []
    for path in sorted((folder / "calls").glob("*.json")):
        call = _read_json(path)
        if isinstance(call, dict):
            recorded.append({"source": "test", **call})
    return [call for call in samples + recorded if call.get("agent_id") == agent_id]


def find_call(agent_id: str, call_id: str) -> dict | None:
    return next((call for call in read_calls(agent_id) if call.get("id") == call_id), None)


def write_recorded(agent_id: str, call: dict) -> Path:
    path = agent_dir(agent_id) / "calls" / f"{call['id']}.json"
    _write(path, call)
    return path


def read_checks(agent_id: str) -> dict[str, dict]:
    data = _read_json(agent_dir(agent_id) / "checks.json")
    return data if isinstance(data, dict) else {}


def write_check(agent_id: str, call_id: str, check: dict) -> None:
    """The editor checks several calls at once, so add one check under a lock.

    Without it, two checks that finish together each read the file, add their
    entry and write it back, and the later write drops the earlier check. The
    lock is per process: the agent API is the only process that writes checks.
    """
    with _checks_lock:
        checks = read_checks(agent_id)
        checks[call_id] = check
        _write(agent_dir(agent_id) / "checks.json", checks)


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
    """Write to a temporary file and rename it over the target.

    A reader never sees a half-written file. A half-written checks.json would
    read as empty, and the next check written would erase all the others.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.{threading.get_ident()}.tmp")
    temporary.write_text(json.dumps(data, indent=2) + "\n")
    os.replace(temporary, path)
