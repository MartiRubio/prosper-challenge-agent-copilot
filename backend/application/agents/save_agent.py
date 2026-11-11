"""Validate an agent document, store it, and keep a snapshot of this save."""

from agent_builder import AgentBuilder
from domain.validation import validate_agent
from infrastructure.agent_files import (
    UnknownAgent,
    agent_path,
    read_document,
    write_document,
)
from infrastructure.agent_history import list_snapshots, write_snapshot
from infrastructure.function_files import catalog_by_name


def save_agent(agent_id: str, document: dict) -> dict:
    if not agent_path(agent_id).is_file():
        raise UnknownAgent(agent_id)
    functions = catalog_by_name()
    validate_agent(document, set(functions))
    AgentBuilder.from_dict(document, functions)
    if not list_snapshots(agent_id):
        # The first save also keeps the agent as it was, so it can be restored.
        write_snapshot(agent_id, read_document(agent_id))
    write_document(agent_id, document)
    write_snapshot(agent_id, document)
    return document
