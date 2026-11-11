"""Ask the model for a list of small graph changes, each tied to evidence."""

import json

from application.copilot.agent_brief import brief_agent, brief_function
from application.copilot.change_shape import check_changes, drop_dangling, prepare_ops
from application.copilot.evidence import evidence_sources, verify_evidence
from application.copilot.extract_rules import extract_rules, rules_into_persona
from infrastructure.openai_client import complete_json
from infrastructure.prompt_files import get_prompt

_ATTACHMENT_LIMIT = 40_000
_ATTEMPTS = 3


def propose_changes(body: dict) -> dict:
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
    rules = extract_rules(attachments) if attachments else []
    payload = _user_payload(document, catalog, message.strip(), focus, calls, attachments, rules)
    prompt = get_prompt("flow_edit")
    user = json.dumps(payload, indent=2)
    turns: list[dict] = []
    warnings: list[str] = []
    for attempt in range(_ATTEMPTS):
        last = attempt == _ATTEMPTS - 1
        data = complete_json(prompt, user, turns=turns)
        try:
            changes = prepare_ops(document, _changes(data))
            if last:
                changes, dropped = drop_dangling(document, changes)
            else:
                dropped = []
            warnings = dropped + check_changes(document, catalog, changes)
        except ValueError as error:
            if last:
                raise
            user, turns = _retry(payload, data, str(error))
            continue
        if warnings and not last:
            user, turns = _retry(payload, data, " ".join(warnings))
            continue
        break
    sources = evidence_sources(message.strip(), calls, attachments)
    for change in changes:
        change["evidence"] = verify_evidence(change.get("evidence"), sources)
    if rules:
        changes = rules_into_persona(document, changes, rules)
    summary = data.get("summary") if isinstance(data.get("summary"), str) else ""
    coverage = [{"rule": rule["rule"], "quote": rule["quote"], "covered_by": "persona"} for rule in rules]
    return {"summary": summary.strip(), "changes": changes, "coverage": coverage, "warnings": warnings}


def _retry(payload: dict, data: dict, problem: str) -> tuple[str, list[dict]]:
    """Ask for a fix as a conversation: the request, the rejected answer, then why.

    The guideline text is the bulk of a request and the rules already carry
    checked quotes from it, so a retry with rules leaves the full text out.
    Only the latest rejected answer is sent, not every earlier attempt.
    """
    request = dict(payload)
    if request.get("rules"):
        request["attachments"] = [
            {"name": item["name"], "text": "(Left out of this retry. Quote the rules' quotes instead.)"}
            for item in request.get("attachments") or []
        ]
    turns = [
        {"role": "assistant", "content": json.dumps(data)},
        {"role": "user", "content": f"That answer was rejected: {problem} Return the whole corrected JSON object."},
    ]
    return json.dumps(request, indent=2), turns


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
    rules: list[dict],
) -> dict:
    return {
        "message": message,
        "focus": focus,
        "calls": calls,
        "rules": [{"id": rule["id"], "rule": rule["rule"], "quote": rule["quote"]} for rule in rules],
        "attachments": attachments,
        "catalog": [brief_function(item) for item in catalog if isinstance(item, dict)],
        "agent": brief_agent(document),
    }
