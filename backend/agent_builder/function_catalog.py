"""The functions every agent can call.

A function lives here, not on one agent. An edge names it. The fields on the
function are the data a test call has to supply.
"""

import json
import re
from pathlib import Path

CATALOG_PATH = Path(__file__).resolve().parent.parent / "functions.json"
_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_-]*$")


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
        if not isinstance(name, str) or not _NAME.match(name):
            raise ValueError(f"Invalid function name '{name}'.")
        if name in seen:
            raise ValueError(f"Function '{name}' is listed twice.")
        seen.add(name)
        properties = _properties(item.get("properties", {}))
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


def _properties(raw: object) -> dict:
    if not isinstance(raw, dict):
        raise ValueError("Function properties must be an object.")
    properties: dict = {}
    for key, value in raw.items():
        if not isinstance(key, str) or not _NAME.match(key) or not isinstance(value, dict):
            raise ValueError(f"Invalid field '{key}'.")
        field = {
            "type": "string",
            "description": value.get("description") if isinstance(value.get("description"), str) else "",
        }
        choices = value.get("enum")
        if isinstance(choices, list) and all(isinstance(choice, str) and choice for choice in choices):
            field["enum"] = choices
        properties[key] = field
    return properties
