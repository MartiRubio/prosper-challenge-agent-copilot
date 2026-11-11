"""Remove an agent and everything recorded about it."""

from infrastructure.agent_files import delete_agent_dir


def delete_agent(agent_id: str) -> None:
    delete_agent_dir(agent_id)
