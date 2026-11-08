"""Create a new minimal agent document."""

import re

from agent_builder import AgentBuilder
from agent_builder.schema import DEFAULT_MODEL, DEFAULT_VOICE_ID
from infrastructure.agent_files import agent_path, write_document

# Same persona as the sample scheduler. A new agent can be called immediately.
_PERSONA = (
    "You are a warm, efficient scheduling assistant for a healthcare clinic. "
    "Your responses are spoken aloud, so avoid emojis, lists, or anything that "
    "can't be read out. Keep replies to one or two short sentences. Always use "
    "an available function to move the conversation forward."
)


def create_agent(name: str | None = None) -> dict:
    display_name = (name or "").strip() or "New agent"
    agent_id = _unique_id(display_name)
    document = {
        "name": display_name,
        "voice_id": DEFAULT_VOICE_ID,
        "model": DEFAULT_MODEL,
        "persona": _PERSONA,
        "initial_node": "greeting",
        "nodes": [
            {
                "name": "greeting",
                "task_messages": [
                    {
                        "role": "developer",
                        "content": "Greet the caller and ask how you can help with their appointment.",
                    }
                ],
                "edges": [],
            }
        ],
    }
    AgentBuilder.from_dict(document)
    write_document(agent_id, document)
    return {"id": agent_id, "agent": document}


def _unique_id(name: str) -> str:
    base = _slug(name)
    candidate = base
    suffix = 2
    while agent_path(candidate).is_file():
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def _slug(name: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "-", name).strip("-").lower()
    return slug[:48] or "agent"
