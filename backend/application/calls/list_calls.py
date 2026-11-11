"""Calls for one agent, newest first, each with the copilot's check when it has one."""

from infrastructure.agent_files import InvalidAgentId
from infrastructure.call_files import read_calls, read_checks


def list_calls(agent_id: str) -> list[dict]:
    if not agent_id:
        return []
    try:
        calls = read_calls(agent_id)
        checks = read_checks(agent_id)
    except InvalidAgentId:
        return []
    listed = []
    for call in calls:
        item = {key: value for key, value in call.items() if key != "agent"}
        item["check"] = checks.get(call.get("id"))
        listed.append(item)
    listed.sort(key=lambda item: item.get("started_at") or "", reverse=True)
    return listed
