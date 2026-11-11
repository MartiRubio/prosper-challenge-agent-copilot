"""Apply a list of copilot ops to an agent document."""

import copy

from domain.agent_rules import (
    clean_properties,
    is_plain_function,
    is_valid_name,
    op_rank,
)


def apply_ops(document: dict, ops: list, catalog: list) -> tuple[dict, list]:
    if not isinstance(document, dict) or not isinstance(document.get("nodes"), list):
        raise ValueError("agent must be an object with nodes.")
    if not isinstance(ops, list):
        raise ValueError("ops must be a list.")
    doc = copy.deepcopy(document)
    functions = copy.deepcopy(catalog) if isinstance(catalog, list) else []
    doc.setdefault("nodes", [])
    ordered = sorted(ops, key=op_rank)
    for op in ordered:
        if not isinstance(op, dict):
            raise ValueError("Each op must be an object.")
        _apply(doc, functions, op)
    return doc, functions


def _apply(doc: dict, functions: list, op: dict) -> None:
    kind = op.get("op")
    if kind == "set_persona":
        doc["persona"] = _text(op.get("content"))
        return
    if kind == "set_task":
        node = _require_node(doc, op.get("node"))
        node["task_messages"] = [{"role": "developer", "content": _text(op.get("content"))}]
        return
    if kind == "add_node":
        _add_node(doc, op)
        return
    if kind == "remove_node":
        _remove_node(doc, op.get("node"))
        return
    if kind == "add_edge":
        _add_edge(doc, functions, op)
        return
    if kind == "remove_edge":
        _remove_edge(doc, op.get("source"), op.get("function"))
        return
    if kind == "set_edge":
        _set_edge(doc, op)
        return
    if kind == "add_function":
        _add_function(functions, op)
        return
    if kind == "set_initial":
        name = op.get("node")
        _require_node(doc, name)
        doc["initial_node"] = name
        return
    if kind == "set_end":
        node = _require_node(doc, op.get("node"))
        node["end"] = bool(op.get("end"))
        return
    raise ValueError(f"Unknown op '{kind}'.")


def _add_node(doc: dict, op: dict) -> None:
    name = op.get("name")
    if not is_valid_name(name):
        raise ValueError(f"Invalid step name '{name}'.")
    if any(node.get("name") == name for node in doc["nodes"]):
        raise ValueError(f"Step '{name}' already exists.")
    doc["nodes"].append({
        "name": name,
        "task_messages": [{"role": "developer", "content": _text(op.get("content"))}],
        "edges": [],
        "end": bool(op.get("end", False)),
    })
    if not doc.get("initial_node"):
        doc["initial_node"] = name


def _remove_node(doc: dict, name: object) -> None:
    if not isinstance(name, str):
        raise ValueError("remove_node needs a step name.")
    doc["nodes"] = [node for node in doc["nodes"] if node.get("name") != name]
    for node in doc["nodes"]:
        node["edges"] = [
            edge for edge in node.get("edges") or []
            if edge.get("target") != name
        ]
    if doc.get("initial_node") == name:
        doc["initial_node"] = doc["nodes"][0]["name"] if doc["nodes"] else ""


def _add_edge(doc: dict, functions: list, op: dict) -> None:
    node = _require_node(doc, op.get("source"))
    target = op.get("target")
    _require_node(doc, target)
    raw_name = op.get("function")
    if not is_valid_name(raw_name):
        raise ValueError(f"Invalid function name '{raw_name}'.")
    function = _unique_plain(node, raw_name)
    template = _template(functions, function)
    description = op.get("description")
    if not isinstance(description, str) or not description.strip():
        description = (template or {}).get("description") or f"Continue to {target}."
    if template:
        properties = {}
        required: list = []
    else:
        properties = op.get("properties") if isinstance(op.get("properties"), dict) else {}
        required = op.get("required") if isinstance(op.get("required"), list) else []
    edges = node.setdefault("edges", [])
    edges.append({
        "function": function,
        "description": description.strip(),
        "target": target,
        "properties": properties,
        "required": [item for item in required if isinstance(item, str)],
    })


def _remove_edge(doc: dict, source: object, function: object) -> None:
    node = _require_node(doc, source)
    if not isinstance(function, str):
        raise ValueError("remove_edge needs a function.")
    edges = node.get("edges") or []
    node["edges"] = [edge for edge in edges if edge.get("function") != function]


def _set_edge(doc: dict, op: dict) -> None:
    node = _require_node(doc, op.get("source"))
    function = op.get("function")
    edge = next((item for item in node.get("edges") or [] if item.get("function") == function), None)
    if edge is None:
        existing = ", ".join(str(item.get("function")) for item in node.get("edges") or []) or "none"
        raise ValueError(
            f"Step '{node['name']}' has no arrow '{function}'. Its arrows are: {existing}. "
            "Use one of those names, or add_edge for a new arrow."
        )
    if isinstance(op.get("description"), str):
        edge["description"] = op["description"]
    if "target" in op and op.get("target") is not None:
        _require_node(doc, op.get("target"))
        edge["target"] = op["target"]


def _add_function(functions: list, op: dict) -> None:
    name = op.get("name")
    if not is_valid_name(name):
        raise ValueError(f"Invalid function name '{name}'.")
    properties = clean_properties(op.get("properties") or {})
    required = op.get("required") if isinstance(op.get("required"), list) else []
    entry = {
        "name": name,
        "description": _text(op.get("description")),
        "properties": properties,
        "required": [item for item in required if isinstance(item, str) and item in properties],
    }
    for index, item in enumerate(functions):
        if isinstance(item, dict) and item.get("name") == name:
            functions[index] = entry
            return
    functions.append(entry)


def _unique_plain(node: dict, name: str) -> str:
    used = {edge.get("function") for edge in node.get("edges") or []}
    if name not in used:
        return name
    if not is_plain_function(name):
        raise ValueError(f"Step '{node['name']}' already uses '{name}'.")
    index = 2
    while f"{name}_{index}" in used:
        index += 1
    return f"{name}_{index}"


def _require_node(doc: dict, name: object) -> dict:
    if not isinstance(name, str) or not name:
        raise ValueError("A step name is required.")
    for node in doc["nodes"]:
        if node.get("name") == name:
            return node
    raise ValueError(f"Unknown step '{name}'.")


def _template(functions: list, name: str) -> dict | None:
    for item in functions:
        if isinstance(item, dict) and item.get("name") == name:
            return item
    return None


def _text(value: object) -> str:
    return value.strip() if isinstance(value, str) else ""
