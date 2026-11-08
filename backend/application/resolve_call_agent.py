"""Pick the agent file for one voice session."""

from pathlib import Path

from infrastructure.agent_files import AGENTS_DIR, UnknownAgent, agent_path

EXAMPLE_FLOW = Path(__file__).resolve().parent.parent / "example_flow.json"


def call_agent_id(path: Path) -> str | None:
    if path.resolve().parent == AGENTS_DIR.resolve():
        return path.stem
    return None


def resolve_call_agent(body) -> Path:
    agent_id = _agent_id(body)
    if not agent_id:
        return EXAMPLE_FLOW
    path = agent_path(agent_id)
    if not path.is_file():
        raise UnknownAgent(agent_id)
    return path


def _agent_id(body) -> str | None:
    if body is None:
        return None
    if isinstance(body, dict):
        agent_id = body.get("agent_id")
    else:
        agent_id = getattr(body, "agent_id", None)
    if agent_id is None or agent_id == "":
        return None
    return str(agent_id)
