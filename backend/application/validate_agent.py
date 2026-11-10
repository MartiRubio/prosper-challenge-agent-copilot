"""Stricter checks for a graph the copilot is about to apply."""

import re

_PLAIN = re.compile(r"^(?:no_function|continue)(?:[-_]\d+)?$")


def validate_generated(document: dict, catalog_names: set[str]) -> None:
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
    initial = document.get("initial_node")
    if initial not in known:
        raise ValueError("Start must point at a step.")
    for node in nodes:
        _task(node)
        _edges(node, known, catalog_names)


def _task(node: dict) -> None:
    messages = node.get("task_messages") or []
    content = ""
    if isinstance(messages, list) and messages and isinstance(messages[0], dict):
        raw = messages[0].get("content")
        content = raw if isinstance(raw, str) else ""
    if not content.strip():
        raise ValueError(f"Step '{node['name']}' needs a spoken task.")


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
        if not _PLAIN.match(function) and function not in catalog_names:
            raise ValueError(f"Function '{function}' is not in the catalog.")
        functions.append(function)
    if len(functions) != len(set(functions)):
        raise ValueError(f"Step '{node['name']}' uses a function twice.")
