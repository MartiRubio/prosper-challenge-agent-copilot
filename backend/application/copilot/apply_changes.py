"""Apply copilot ops to an agent and check the result is still a valid agent."""

from domain.patch import apply_ops
from domain.validation import validate_agent


def apply_changes(document: dict, ops: list, catalog: list) -> tuple[dict, list]:
    agent, functions = apply_ops(document, ops, catalog)
    names = {
        item.get("name")
        for item in functions
        if isinstance(item, dict) and isinstance(item.get("name"), str)
    }
    validate_agent(agent, names)
    return agent, functions
