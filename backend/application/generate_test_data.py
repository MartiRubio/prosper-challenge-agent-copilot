"""Make up a consistent caller for the fields a test call needs."""

import json

from application.agent_brief import brief_agent
from application.prompts import TEST_DATA
from infrastructure.openai_client import complete_json


def generate_test_data(body: dict) -> dict:
    fields = [
        field for field in body.get("fields") or []
        if isinstance(field, dict) and isinstance(field.get("name"), str)
    ]
    if not fields:
        raise ValueError("There are no fields to fill.")
    agent = body.get("agent") if isinstance(body.get("agent"), dict) else {}
    data = complete_json(TEST_DATA, json.dumps({
        "fields": fields,
        "agent": brief_agent(agent),
    }, indent=2), temperature=0.8)
    raw = data.get("values") if isinstance(data.get("values"), dict) else {}
    values: dict[str, str] = {}
    for field in fields:
        value = raw.get(field["name"])
        if not isinstance(value, str) or not value.strip():
            continue
        options = field.get("options")
        if isinstance(options, list) and options and value not in options:
            continue
        values[field["name"]] = value.strip()
    return {"values": values}
