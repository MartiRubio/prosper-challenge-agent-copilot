"""Load the agent for one voice session.

The editor sends the graph currently on screen. The prebuilt client sends only
an id, and then the session reads the saved file.
"""

from collections.abc import Callable

from agent_builder import AgentBuilder

from application.resolve_call_agent import call_agent_id, resolve_call_agent


def load_call_agent(body, on_transition: Callable[[str], None] | None = None) -> tuple[str | None, AgentBuilder]:
    document = body.get("agent") if isinstance(body, dict) else None
    if isinstance(document, dict):
        agent_id = body.get("agent_id")
        return (str(agent_id) if agent_id else None), AgentBuilder.from_dict(document, on_transition=on_transition)
    path = resolve_call_agent(body)
    return call_agent_id(path), AgentBuilder.from_json(path, on_transition=on_transition)
