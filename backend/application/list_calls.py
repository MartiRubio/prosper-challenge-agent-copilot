"""Call transcripts for one agent. Each agent has one file under logs/calls."""

from application.record_call import read_recorded


def list_calls(agent_id: str) -> list[dict]:
    if not agent_id:
        return []
    found = read_recorded(agent_id)
    found.sort(key=lambda item: item.get("started_at") or "", reverse=True)
    return found
