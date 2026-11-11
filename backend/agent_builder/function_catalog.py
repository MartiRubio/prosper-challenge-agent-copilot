"""The functions every agent can call.

A function lives here, not on one agent. An edge names it. The fields on the
function are the data a test call has to supply.
"""

import json
from pathlib import Path

from domain.agent_rules import clean_properties, is_valid_name

CATALOG_PATH = Path(__file__).resolve().parent.parent / "functions.json"


def read_catalog() -> list[dict]:
    if not CATALOG_PATH.is_file():
        return []
    data = json.loads(CATALOG_PATH.read_text())
    if not isinstance(data, list):
        return []
    return [item for item in data if isinstance(item, dict)]


def catalog_by_name() -> dict[str, dict]:
    return {
        item["name"]: item
        for item in read_catalog()
        if isinstance(item.get("name"), str)
    }


def write_catalog(functions: list) -> list[dict]:
    clean = validate_catalog(functions)
    CATALOG_PATH.write_text(json.dumps(clean, indent=2) + "\n")
    return clean


def validate_catalog(functions: list) -> list[dict]:
    if not isinstance(functions, list):
        raise ValueError("Functions must be a list.")
    seen: set[str] = set()
    clean: list[dict] = []
    for item in functions:
        if not isinstance(item, dict):
            raise ValueError("Each function must be an object.")
        name = item.get("name")
        if not is_valid_name(name):
            raise ValueError(f"Invalid function name '{name}'.")
        if name in seen:
            raise ValueError(f"Function '{name}' is listed twice.")
        seen.add(name)
        properties = clean_properties(item.get("properties", {}))
        required = item.get("required", [])
        if not isinstance(required, list) or not all(isinstance(field, str) for field in required):
            raise ValueError(f"Function '{name}' has an invalid required list.")
        clean.append({
            "name": name,
            "description": item.get("description") if isinstance(item.get("description"), str) else "",
            "properties": properties,
            "required": [field for field in required if field in properties],
        })
    return clean

