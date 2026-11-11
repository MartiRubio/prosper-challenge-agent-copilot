"""Remove one agent file and its saved versions."""

from infrastructure.active_node_file import clear_active_node
from infrastructure.agent_files import UnknownAgent, agent_path
from infrastructure.agent_history import delete_history


def delete_agent(agent_id: str) -> None:
    path = agent_path(agent_id)
    if not path.is_file():
        raise UnknownAgent(agent_id)
    path.unlink()
    clear_active_node(agent_id)
    delete_history(agent_id)
