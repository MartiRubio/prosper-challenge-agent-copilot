"""Ask the model for a list of small graph changes, each tied to evidence."""

import json

from application.agent_brief import brief_agent, brief_function
from application.apply_and_validate import apply_and_validate
from application.prompts import FLOW_EDIT
from domain.agent_rules import is_plain_function, is_valid_name, op_rank
from infrastructure.openai_client import complete_json

_ATTACHMENT_LIMIT = 40_000
_EVIDENCE_SOURCES = {"call", "attachment", "request"}


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
    attachments = _attachments(body.get("attachments"))
    user = _user_payload(document, catalog, message.strip(), focus, calls, attachments)
    data = complete_json(FLOW_EDIT, user)
    try:
        changes = _prepare(document, _changes(data))
        _check(document, catalog, changes)
    except ValueError as first:
        data = complete_json(FLOW_EDIT, user + f"\n\nYour previous JSON was rejected: {first}. Return a corrected JSON object.")
        changes = _prepare(document, _changes(data))
        _check(document, catalog, changes)
    sources = _evidence_sources(message.strip(), calls, attachments)
    for change in changes:
        change["evidence"] = _verify_evidence(change.get("evidence"), sources)
    summary = data.get("summary") if isinstance(data.get("summary"), str) else ""
    return {"summary": summary.strip(), "changes": changes}


def _prepare(document: dict, changes: list[dict]) -> list[dict]:
    used = {
        node.get("name"): {edge.get("function") for edge in (node.get("edges") or [])}
        for node in document.get("nodes") or []
        if isinstance(node, dict)
    }
    for change in changes:
        prepared = []
        for op in sorted(change["ops"], key=op_rank):
            if op.get("op") == "add_node" and isinstance(op.get("name"), str):
                used.setdefault(op["name"], set())
            if op.get("op") == "add_edge":
                op, added = _fresh_function(used, op)
                if added:
                    prepared.append(added)
            if op.get("op") == "remove_edge":
                names = used.get(op.get("source"))
                if names is not None:
                    names.discard(op.get("function"))
            prepared.append(op)
        change["ops"] = prepared
    return changes


def _fresh_function(used: dict, op: dict) -> tuple[dict, dict | None]:
    """A step cannot use one function twice; a repeat becomes its own go_<target> function."""
    source = op.get("source")
    function = op.get("function")
    names = used.setdefault(source, set())
    if not isinstance(function, str) or function not in names or is_plain_function(function):
        if isinstance(function, str):
            names.add(function)
        return op, None
    target = op.get("target") if isinstance(op.get("target"), str) else "next"
    base = f"go_{target}" if is_valid_name(f"go_{target}") else "go_next"
    name = base
    index = 2
    while name in names:
        name = f"{base}_{index}"
        index += 1
    names.add(name)
    description = op.get("description") if isinstance(op.get("description"), str) else f"Continue to {target}."
    added = {
        "op": "add_function",
        "name": name,
        "description": description,
        "properties": {},
        "required": [],
    }
    return {**op, "function": name}, added


def _check(document: dict, catalog: list, changes: list[dict]) -> None:
    ops = [op for change in changes for op in change["ops"]]
    if ops:
        apply_and_validate(document, ops, catalog)


def _changes(data: dict) -> list[dict]:
    raw = data.get("changes") or []
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
            "evidence": item.get("evidence"),
            "ops": ops,
        })
    return changes


def _evidence_sources(message: str, calls: list, attachments: list[dict]) -> dict[tuple[str, str], str]:
    sources: dict[tuple[str, str], str] = {("request", "message"): message}
    for call in calls:
        lines = [turn.get("text", "") for turn in call.get("turns") or [] if isinstance(turn, dict)]
        lines.append(call.get("feedback") or "")
        sources[("call", str(call.get("id")))] = "\n".join(lines)
    for attachment in attachments:
        sources[("attachment", attachment["name"])] = attachment["text"]
    return sources


def _verify_evidence(raw: object, sources: dict[tuple[str, str], str]) -> list[dict]:
    """Keep well-formed citations and mark whether the quote really is in its source."""
    if not isinstance(raw, list):
        return []
    evidence = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        source = item.get("source")
        ref = item.get("ref") if isinstance(item.get("ref"), str) else ""
        quote = item.get("quote") if isinstance(item.get("quote"), str) else ""
        if source not in _EVIDENCE_SOURCES or not quote.strip():
            continue
        if source == "request":
            ref = "message"
        text = sources.get((source, ref), "")
        evidence.append({
            "source": source,
            "ref": ref,
            "quote": quote.strip(),
            "verified": _normalize(quote) in _normalize(text) if text else False,
        })
    return evidence


def _normalize(text: str) -> str:
    return " ".join("".join(ch.lower() if ch.isalnum() else " " for ch in text).split())


def _calls_for_agent(raw: object, agent_id: str) -> list:
    if not agent_id or not isinstance(raw, list):
        return []
    return [
        call for call in raw
        if isinstance(call, dict) and call.get("agent_id") == agent_id
    ]


def _attachments(raw: object) -> list[dict]:
    if not isinstance(raw, list):
        return []
    found = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        text = item.get("text")
        if isinstance(name, str) and isinstance(text, str) and text.strip():
            found.append({"name": name.strip(), "text": text.strip()[:_ATTACHMENT_LIMIT]})
    return found


def _user_payload(
    document: dict,
    catalog: list,
    message: str,
    focus: list,
    calls: list,
    attachments: list[dict],
) -> str:
    return json.dumps({
        "message": message,
        "focus": focus,
        "calls": calls,
        "attachments": attachments,
        "catalog": [brief_function(item) for item in catalog if isinstance(item, dict)],
        "agent": brief_agent(document),
    }, indent=2)
