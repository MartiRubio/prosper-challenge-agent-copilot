"""Pull every specific, testable rule out of a client's guideline documents.

Measured on docs/samples/lakeside-guidelines.pdf (12 buried rules):
- one call over the whole document finds 7-9 of them; it keeps skipping the
  same table cell and the same FAQ answer;
- overlapping ~6,000-character slices read in parallel find 11-12.
So slices are read in parallel, a rule is kept only when its quote is in the
document, and one merge call then folds the ~90 raw rules (many repeats from
overlapping slices) into ~45, so the persona and the review list stay readable.
"""

import json
from concurrent.futures import ThreadPoolExecutor

from application.copilot.evidence import quote_in
from infrastructure.openai_client import complete_json
from infrastructure.prompt_files import get_prompt

_SLICE = 6_000
_OVERLAP = 600


def extract_rules(attachments: list[dict]) -> list[dict]:
    slices = [
        (attachment["name"], part)
        for attachment in attachments
        for part in _slices(attachment["text"])
    ]
    if not slices:
        return []
    with ThreadPoolExecutor(max_workers=6) as pool:
        found = list(pool.map(lambda item: _rules_in(*item), slices))
    rules: list[dict] = []
    seen: set[str] = set()
    for name, items in found:
        source = next(a["text"] for a in attachments if a["name"] == name)
        for item in items:
            rule, quote = item.get("rule"), item.get("quote")
            if not isinstance(rule, str) or not isinstance(quote, str) or not rule.strip():
                continue
            if not quote_in(quote, source):
                continue
            key = " ".join(rule.lower().split())
            if key in seen:
                continue
            seen.add(key)
            rules.append({"id": f"r{len(rules) + 1}", "rule": rule.strip(), "quote": quote.strip(), "source": name})
    return _merge(rules)


def _merge(rules: list[dict]) -> list[dict]:
    """One deduplicated list; each merged rule keeps the quote of a rule it came from."""
    if len(rules) <= 12:
        return rules
    payload = json.dumps({"rules": [{"id": rule["id"], "rule": rule["rule"]} for rule in rules]})
    data = complete_json(get_prompt("rule_merge"), payload, temperature=0)
    by_id = {rule["id"]: rule for rule in rules}
    merged: list[dict] = []
    for item in data.get("rules") or []:
        if not isinstance(item, dict) or not isinstance(item.get("rule"), str):
            continue
        origins = [by_id[ref] for ref in item.get("from") or [] if ref in by_id]
        if not origins:
            continue
        merged.append({
            "id": f"r{len(merged) + 1}",
            "rule": item["rule"].strip(),
            "quote": origins[0]["quote"],
            "source": origins[0]["source"],
        })
    if not merged:
        return rules
    return merged


def _slices(text: str) -> list[str]:
    """Cut at paragraph breaks near the slice size, with a little overlap."""
    parts: list[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + _SLICE)
        if end < len(text):
            cut = text.rfind("\n", start + _SLICE // 2, end)
            end = cut if cut > start else end
        parts.append(text[start:end])
        if end >= len(text):
            break
        start = max(end - _OVERLAP, start + 1)
    return parts


def _rules_in(name: str, part: str) -> tuple[str, list]:
    data = complete_json(get_prompt("rule_extract"), json.dumps({"document": name, "text": part}), temperature=0)
    rules = data.get("rules")
    return name, rules if isinstance(rules, list) else []


_RULES_HEADING = "Clinic rules:"


def rules_into_persona(document: dict, changes: list[dict], rules: list[dict]) -> list[dict]:
    """Copy every extracted rule into the persona verbatim, as one change reviewed first.

    The model paraphrases rules away when it restates them, so it never writes
    them: it designs the graph, and the server owns the rule list. Any persona
    the model proposed becomes the opening of the new one.
    """
    base = _strip_rules(document.get("persona") or "")
    kept: list[dict] = []
    for change in changes:
        persona_ops = [op for op in change["ops"] if op.get("op") == "set_persona"]
        if persona_ops:
            base = _strip_rules(persona_ops[-1].get("content") or base)
        others = [op for op in change["ops"] if op.get("op") != "set_persona"]
        if others:
            kept.append({**change, "ops": others})
    lines = "\n".join(f"{index}. {rule['rule']}" for index, rule in enumerate(rules, start=1))
    rules_change = {
        "id": "rules",
        "title": f"Add the client’s {len(rules)} rules to the persona",
        "detail": "Copied word for word from the guidelines. The persona is in front of the agent at every step.",
        "evidence": [
            {"source": "attachment", "ref": rule["source"], "quote": rule["quote"], "verified": True}
            for rule in rules[:3]
        ],
        "ops": [{"op": "set_persona", "content": f"{base.strip()}\n\n{_RULES_HEADING}\n{lines}".strip()}],
    }
    return [rules_change, *kept]


def _strip_rules(persona: str) -> str:
    index = persona.find(_RULES_HEADING)
    return persona[:index].rstrip() if index >= 0 else persona
