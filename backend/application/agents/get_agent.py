"""Load one saved agent document."""

from infrastructure.agent_files import read_document


def get_agent(agent_id: str) -> dict:
    return read_document(agent_id)
