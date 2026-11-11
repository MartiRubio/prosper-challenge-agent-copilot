"""Save the spoken turns of a finished test call, with the graph it ran."""

from datetime import datetime, timezone

from loguru import logger

from infrastructure.agent_files import InvalidAgentId, agent_path
from infrastructure.call_files import append_recorded


def record_call(
    agent_id: str | None,
    messages: list,
    agent: dict | None = None,
    start_node: str | None = None,
    test_data: dict[str, str] | None = None,
) -> None:
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
    call = {
        "id": f"call-{stamp.strftime('%Y%m%dT%H%M%S%fZ')}",
        "agent_id": agent_id,
        "title": _title(turns),
        "started_at": stamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "test",
        "turns": turns,
    }
    if isinstance(agent, dict):
        call["agent"] = agent
    initial = agent.get("initial_node") if isinstance(agent, dict) else None
    if start_node and start_node != initial:
        # Started mid-graph from the editor: earlier steps were skipped on purpose.
        call["start_node"] = start_node
        call["test_data"] = test_data or {}
    path = append_recorded(agent_id, call)
    logger.info(f"Saved {len(turns)} turns for {agent_id} to {path.name}")


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
