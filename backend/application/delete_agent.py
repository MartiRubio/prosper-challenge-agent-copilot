"""Remove one agent file."""

from infrastructure.active_node_file import clear_active_node
from infrastructure.agent_files import UnknownAgent, agent_path


def delete_agent(agent_id: str) -> None:
    path = agent_path(agent_id)
    if not path.is_file():
        raise UnknownAgent(agent_id)
    path.unlink()
    clear_active_node(agent_id)
