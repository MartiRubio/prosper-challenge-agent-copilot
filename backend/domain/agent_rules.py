"""Names, plain continues, and op order for an agent graph.

Every module that validates or patches an agent reads these from here, so the
copilot, the save path, and the function catalog agree on what is allowed.
"""

import re

NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_-]*$")

# An arrow that only moves on, with no fields. A second one from the same step
# gets a numeric suffix.
PLAIN_FUNCTION = re.compile(r"^(?:no_function|continue)(?:[-_]\d+)?$")

# Functions and steps have to exist before any arrow names them.
OP_ORDER = {
    "add_function": 0,
    "add_node": 1,
    "set_persona": 2,
    "set_task": 3,
    "set_initial": 4,
    "set_end": 5,
    "add_edge": 6,
    "set_edge": 7,
    "remove_edge": 8,
    "remove_node": 9,
}


def is_valid_name(value: object) -> bool:
    return isinstance(value, str) and bool(NAME.match(value))


def is_plain_function(name: object) -> bool:
    return isinstance(name, str) and bool(PLAIN_FUNCTION.match(name))


def op_rank(op: object) -> int:
    if not isinstance(op, dict):
        return len(OP_ORDER)
    return OP_ORDER.get(op.get("op"), len(OP_ORDER))


def task_text(node: dict) -> str:
    """The spoken task of a step: the first task message's content."""
    messages = node.get("task_messages") or []
    if isinstance(messages, list) and messages and isinstance(messages[0], dict):
        content = messages[0].get("content")
        if isinstance(content, str):
            return content
    return ""


def clean_properties(raw: object) -> dict:
    """Normalize a function's fields: string type, a description, optional choices."""
    if not isinstance(raw, dict):
        raise ValueError("Function properties must be an object.")
    properties: dict = {}
    for key, value in raw.items():
        if not is_valid_name(key) or not isinstance(value, dict):
            raise ValueError(f"Invalid field '{key}'.")
        field = {
            "type": "string",
            "description": value.get("description") if isinstance(value.get("description"), str) else "",
        }
        choices = value.get("enum")
        if isinstance(choices, list) and choices and all(isinstance(choice, str) and choice for choice in choices):
            field["enum"] = choices
        properties[key] = field
    return properties


def edge_tool(edge: dict, catalog: dict[str, dict]) -> dict:
    """What the model sees for one arrow.

    The catalog owns the fields. The arrow's own description wins over the
    catalog's, because it says when to leave this particular step.
    """
    function = edge.get("function") or ""
    target = edge.get("target") or ""
    spec = catalog.get(function)
    if spec:
        description = edge.get("description") or spec.get("description") or ""
        properties = spec.get("properties") or {}
        required = spec.get("required") or []
    else:
        description = edge.get("description") or ""
        properties = edge.get("properties") or {}
        required = edge.get("required") or []
    return {
        "name": function,
        "description": with_destination(description, target),
        "properties": properties,
        "required": required,
        "target": target,
    }


def with_destination(description: str, target: str) -> str:
    continuation = f"Continue to {target}."
    text = (description or "").strip()
    if continuation in text:
        return text
    return f"{text} {continuation}".strip()
