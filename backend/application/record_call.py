"""Save the spoken turns of a finished test call. One file per agent."""

import json
from datetime import datetime, timezone
from pathlib import Path

from loguru import logger

from infrastructure.agent_files import InvalidAgentId, agent_path

_CALLS_DIR = Path(__file__).resolve().parent.parent / "logs" / "calls"


def record_call(agent_id: str | None, messages: list) -> None:
    if not agent_id:
        logger.warning("Call log skipped: the session had no agent id.")
        return
    try:
        agent_path(agent_id)
    except InvalidAgentId:
        logger.warning(f"Call log skipped: '{agent_id}' is not an agent id.")
        return
    turns = spoken_turns(messages)
    if not turns:
        logger.warning(f"Call log skipped: no spoken turns in {len(messages)} messages.")
        return
    stamp = datetime.now(timezone.utc)
    started = stamp.strftime("%Y-%m-%dT%H:%M:%SZ")
    call = {
        "id": f"call-{stamp.strftime('%Y%m%dT%H%M%S%fZ')}",
        "agent_id": agent_id,
        "title": _title(turns),
        "started_at": started,
        "turns": turns,
    }
    path = _path(agent_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    current = _read(path)
    current.append(call)
    path.write_text(json.dumps(current, indent=2))
    logger.info(f"Saved {len(turns)} turns for {agent_id} to {path.name}")


def read_recorded(agent_id: str) -> list[dict]:
    try:
        agent_path(agent_id)
    except InvalidAgentId:
        return []
    return [item for item in _read(_path(agent_id)) if item.get("agent_id") == agent_id]


def spoken_turns(messages: list) -> list[dict]:
    turns: list[dict] = []
    for message in messages:
        role, content = _role_and_content(message)
        if role == "user":
            speaker = "caller"
        elif role == "assistant":
            speaker = "agent"
        else:
            continue
        text = _text(content)
        if text:
            turns.append({"role": speaker, "text": text})
    return turns


def _title(turns: list[dict]) -> str:
    caller = next((turn["text"] for turn in turns if turn["role"] == "caller"), "")
    if not caller:
        return "Test call"
    if len(caller) <= 48:
        return caller
    return caller[:45].rstrip() + "..."


def _path(agent_id: str) -> Path:
    return _CALLS_DIR / f"{agent_id}.json"


def _read(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    return [item for item in data if isinstance(item, dict)]


def _role_and_content(message: object) -> tuple[object, object]:
    if isinstance(message, dict):
        return message.get("role"), message.get("content")
    return getattr(message, "role", None), getattr(message, "content", None)


def _text(content: object) -> str:
    if isinstance(content, str):
        return content.strip()
    if not isinstance(content, list):
        return ""
    parts: list[str] = []
    for item in content:
        if isinstance(item, str) and item.strip():
            parts.append(item.strip())
        elif isinstance(item, dict) and isinstance(item.get("text"), str) and item["text"].strip():
            parts.append(item["text"].strip())
    return " ".join(parts)
