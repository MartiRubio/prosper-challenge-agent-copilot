"""Load the agent for one voice session.

The editor sends the graph currently on screen. The prebuilt client sends only
an id, and then the session reads the saved file. With neither, the session
runs the starter's example flow.
"""

from collections.abc import Callable
from pathlib import Path

from agent_builder import AgentBuilder
from infrastructure.agent_files import UnknownAgent, agent_path
from infrastructure.function_files import catalog_by_name

EXAMPLE_FLOW = Path(__file__).resolve().parents[2] / "example_flow.json"


def load_call_agent(body, on_transition: Callable[[str], None] | None = None) -> tuple[str | None, AgentBuilder]:
    functions = catalog_by_name()
    agent_id = _agent_id(body)
    document = body.get("agent") if isinstance(body, dict) else None
    if isinstance(document, dict):
        return agent_id, AgentBuilder.from_dict(document, functions, on_transition)
    if not agent_id:
        return None, AgentBuilder.from_json(EXAMPLE_FLOW, functions, on_transition)
    path = agent_path(agent_id)
    if not path.is_file():
        raise UnknownAgent(agent_id)
    return agent_id, AgentBuilder.from_json(path, functions, on_transition)


def _agent_id(body) -> str | None:
    if body is None:
        return None
    agent_id = body.get("agent_id") if isinstance(body, dict) else getattr(body, "agent_id", None)
    if agent_id is None or agent_id == "":
        return None
    return str(agent_id)
