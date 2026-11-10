"""Ask the model for a list of small graph changes."""

import json
import re

from application.apply_patch import apply_ops
from application.openai_json import complete_json
from application.prompts import FLOW_EDIT
from application.validate_agent import validate_generated

_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_-]*$")
_PLAIN = re.compile(r"^(?:no_function|continue)(?:[-_]\d+)?$")
_ORDER = {
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


def copilot_edit(body: dict) -> dict:
    document = body.get("agent")
    if not isinstance(document, dict):
        raise ValueError("agent must be an object.")
    message = body.get("message")
    if not isinstance(message, str) or not message.strip():
        raise ValueError("Tell the copilot what to change.")
    catalog = body.get("catalog") if isinstance(body.get("catalog"), list) else []
    focus = body.get("focus") if isinstance(body.get("focus"), list) else []
    agent_id = body.get("agent_id") if isinstance(body.get("agent_id"), str) else ""
    calls = _calls_for_agent(body.get("calls"), agent_id)
    user = _user_payload(document, catalog, message.strip(), focus, calls)
    data = complete_json(FLOW_EDIT, user)
    try:
        changes = _prepare(document, _changes(data))
        _check(document, catalog, changes)
    except ValueError as first:
        data = complete_json(FLOW_EDIT, user + f"\n\nYour previous JSON was rejected: {first}. Return a corrected JSON object.")
        changes = _prepare(document, _changes(data))
        _check(document, catalog, changes)
    summary = data.get("summary") if isinstance(data.get("summary"), str) else ""
    return {"summary": summary.strip(), "changes": changes}


def _prepare(document: dict, changes: list[dict]) -> list[dict]:
    used = {
        node.get("name"): {edge.get("function") for edge in (node.get("edges") or [])}
        for node in document.get("nodes") or []
        if isinstance(node, dict)
    }
    for change in changes:
        ordered = sorted(change["ops"], key=lambda op: _ORDER.get(op.get("op"), 50))
        prepared = []
        for op in ordered:
            if op.get("op") == "add_node" and isinstance(op.get("name"), str):
                used.setdefault(op["name"], set())
            if op.get("op") == "add_edge":
                op = _fresh_function(used, op)
                if op.get("_added_function"):
                    prepared.append(op.pop("_added_function"))
            if op.get("op") == "remove_edge":
                names = used.get(op.get("source"))
                if names is not None:
                    names.discard(op.get("function"))
            prepared.append(op)
        change["ops"] = prepared
    return changes


def _fresh_function(used: dict, op: dict) -> dict:
    source = op.get("source")
    function = op.get("function")
    names = used.setdefault(source, set())
    if not isinstance(function, str) or function not in names or _PLAIN.match(function):
        if isinstance(function, str):
            names.add(function)
        return op
    target = op.get("target") if isinstance(op.get("target"), str) else "next"
    base = f"go_{target}"
    if not _NAME.match(base):
        base = "go_next"
    name = base
    index = 2
    while name in names:
        name = f"{base}_{index}"
        index += 1
    names.add(name)
    description = op.get("description") if isinstance(op.get("description"), str) else f"Continue to {target}."
    op = {**op, "function": name}
    op["_added_function"] = {
        "op": "add_function",
        "name": name,
        "description": description,
        "properties": {},
        "required": [],
    }
    return op


def _check(document: dict, catalog: list, changes: list[dict]) -> None:
    ops = [op for change in changes for op in change["ops"]]
    if not ops:
        return
    agent, functions = apply_ops(document, ops, catalog)
    names = {
        item.get("name")
        for item in functions
        if isinstance(item, dict) and isinstance(item.get("name"), str)
    }
    validate_generated(agent, names)


def _changes(data: dict) -> list[dict]:
    raw = data.get("changes", [])
    if raw is None:
        raw = []
    if not isinstance(raw, list):
        raise ValueError("changes must be a list.")
    changes: list[dict] = []
    for index, item in enumerate(raw, start=1):
        if not isinstance(item, dict):
            raise ValueError("Each change must be an object.")
        ops = item.get("ops")
        if not isinstance(ops, list) or not ops:
            raise ValueError("Each change needs ops.")
        for op in ops:
            if not isinstance(op, dict) or not isinstance(op.get("op"), str):
                raise ValueError("Each op needs an op name.")
        change_id = item.get("id") if isinstance(item.get("id"), str) and item.get("id") else f"c{index}"
        title = item.get("title") if isinstance(item.get("title"), str) else change_id
        detail = item.get("detail") if isinstance(item.get("detail"), str) else ""
        changes.append({
            "id": change_id,
            "title": title.strip() or change_id,
            "detail": detail.strip(),
            "ops": ops,
        })
    return changes


def _calls_for_agent(raw: object, agent_id: str) -> list:
    if not agent_id or not isinstance(raw, list):
        return []
    return [
        call for call in raw
        if isinstance(call, dict) and call.get("agent_id") == agent_id
    ]


def _user_payload(document: dict, catalog: list, message: str, focus: list, calls: list) -> str:
    return json.dumps({
        "message": message,
        "focus": focus,
        "calls": calls,
        "catalog": [_brief_function(item) for item in catalog if isinstance(item, dict)],
        "agent": _brief_agent(document),
    }, indent=2)


def _brief_agent(document: dict) -> dict:
    nodes = []
    for node in document.get("nodes") or []:
        if not isinstance(node, dict):
            continue
        messages = node.get("task_messages") or []
        content = ""
        if messages and isinstance(messages[0], dict) and isinstance(messages[0].get("content"), str):
            content = messages[0]["content"]
        edges = []
        for edge in node.get("edges") or []:
            if not isinstance(edge, dict):
                continue
            edges.append({
                "function": edge.get("function"),
                "description": edge.get("description"),
                "target": edge.get("target"),
            })
        nodes.append({
            "name": node.get("name"),
            "task": content,
            "end": bool(node.get("end")),
            "edges": edges,
        })
    return {
        "name": document.get("name"),
        "persona": document.get("persona") or "",
        "initial_node": document.get("initial_node") or "",
        "nodes": nodes,
    }


def _brief_function(item: dict) -> dict:
    return {
        "name": item.get("name"),
        "description": item.get("description") or "",
        "properties": item.get("properties") or {},
        "required": item.get("required") or [],
    }
