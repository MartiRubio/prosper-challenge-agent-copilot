"""Read one call and say whether something went wrong, and where."""

import json
from datetime import datetime, timezone

from application.agent_brief import brief_agent
from application.prompts import CALL_CHECK
from infrastructure.agent_files import UnknownAgent, read_document
from infrastructure.call_files import find_call, write_check
from infrastructure.openai_client import complete_json

_SEVERITIES = {"low", "medium", "high"}


class UnknownCall(LookupError):
    """No call with this id for this agent."""


def check_call(agent_id: str, call_id: str) -> dict:
    call = find_call(agent_id, call_id)
    if call is None:
        raise UnknownCall(call_id)
    agent = call.get("agent") if isinstance(call.get("agent"), dict) else None
    if agent is None:
        try:
            agent = read_document(agent_id)
        except UnknownAgent:
            agent = {}
    user = json.dumps({
        "agent": brief_agent(agent),
        **_started_mid_graph(call),
        "transcript": [
            {"speaker": turn.get("role"), "text": turn.get("text")}
            for turn in call.get("turns") or []
            if isinstance(turn, dict)
        ],
    }, indent=2)
    check = _clean(complete_json(CALL_CHECK, user, temperature=0))
    write_check(agent_id, call_id, check)
    return check


def _started_mid_graph(call: dict) -> dict:
    """A test call started from a later step skips the earlier ones on purpose."""
    start = call.get("start_node")
    if not isinstance(start, str) or not start:
        if call.get("source") == "test":
            # Older test calls did not record where they started.
            return {"call_type": "test call placed from the editor; it may have started at a later step"}
        return {}
    return {
        "started_at_step": start,
        "test_data_given_to_agent": call.get("test_data") or {},
    }


def _clean(data: dict) -> dict:
    status = "issue" if data.get("status") == "issue" else "ok"
    severity = data.get("severity") if data.get("severity") in _SEVERITIES else "low"

    def text(key: str) -> str:
        value = data.get(key)
        return value.strip() if isinstance(value, str) and status == "issue" else ""

    return {
        "status": status,
        "severity": severity,
        "issue": text("issue"),
        "step": text("step"),
        "quote": text("quote"),
        "feedback": text("feedback"),
        "checked_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
