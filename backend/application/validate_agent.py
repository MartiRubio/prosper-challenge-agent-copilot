"""Checks every saved or patched agent passes: steps, Start, tasks, and arrows."""

from domain.agent_rules import is_plain_function, task_text


def validate_agent(document: dict, catalog_names: set[str]) -> None:
    nodes = document.get("nodes")
    if not isinstance(nodes, list) or not nodes:
        raise ValueError("Agent has no steps.")
    names: list[str] = []
    for node in nodes:
        if not isinstance(node, dict):
            raise ValueError("Every step must be an object.")
        name = node.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ValueError("Every step needs a name.")
        names.append(name)
    if len(names) != len(set(names)):
        raise ValueError("Step names must be unique.")
    known = set(names)
    if document.get("initial_node") not in known:
        raise ValueError("Start must point at a step.")
    for node in nodes:
        if not task_text(node).strip():
            raise ValueError(f"Step '{node['name']}' needs a spoken task.")
        _edges(node, known, catalog_names)


def _edges(node: dict, known: set[str], catalog_names: set[str]) -> None:
    edges = node.get("edges") or []
    if not isinstance(edges, list):
        raise ValueError(f"Step '{node['name']}' has invalid arrows.")
    functions: list[str] = []
    for edge in edges:
        if not isinstance(edge, dict):
            raise ValueError(f"Step '{node['name']}' has an invalid arrow.")
        function = edge.get("function")
        target = edge.get("target")
        if not isinstance(function, str) or not function:
            raise ValueError(f"Step '{node['name']}' has an arrow without a function.")
        if not isinstance(target, str) or target not in known:
            raise ValueError(
                f"Arrow '{function}' in '{node['name']}' targets unknown step '{target}'."
            )
        if not is_plain_function(function) and function not in catalog_names:
            raise ValueError(f"Function '{function}' is not in the catalog.")
        functions.append(function)
    if len(functions) != len(set(functions)):
        raise ValueError(f"Step '{node['name']}' uses a function twice.")
