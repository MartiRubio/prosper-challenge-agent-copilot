"""Remember which node the current local call is in.

The development runner serves one editor at a time, so a single bound agent
id is enough. A second overlapping call would overwrite it.
"""

from application.announce_node import announce_node
from infrastructure.active_node_file import clear_active_node, write_active_node

_agent_id: str | None = None


def bind_call_agent(agent_id: str | None) -> None:
    global _agent_id
    _agent_id = agent_id


def track_active_node(node_name: str) -> None:
    if _agent_id is None:
        return
    write_active_node(_agent_id, node_name)
    announce_node(node_name)


def clear_tracked_node() -> None:
    if _agent_id is None:
        return
    clear_active_node(_agent_id)
