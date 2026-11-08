"""Validate an agent document and store it."""

from agent_builder import AgentBuilder
from infrastructure.agent_files import UnknownAgent, agent_path, write_document


def save_agent(agent_id: str, document: dict) -> dict:
    if not agent_path(agent_id).is_file():
        raise UnknownAgent(agent_id)
    AgentBuilder.from_dict(document)
    write_document(agent_id, document)
    return document
