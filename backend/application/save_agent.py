"""Validate an agent document, store it, and keep a snapshot of this save."""

from agent_builder import AgentBuilder
from agent_builder.function_catalog import catalog_by_name
from application.validate_agent import validate_agent
from infrastructure.agent_files import UnknownAgent, agent_path, write_document
from infrastructure.agent_history import write_snapshot


def save_agent(agent_id: str, document: dict) -> dict:
    if not agent_path(agent_id).is_file():
        raise UnknownAgent(agent_id)
    validate_agent(document, set(catalog_by_name()))
    AgentBuilder.from_dict(document)
    write_document(agent_id, document)
    write_snapshot(agent_id, document)
    return document
