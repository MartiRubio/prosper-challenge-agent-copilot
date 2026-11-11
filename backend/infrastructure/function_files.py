"""The shared function catalog, stored in data/functions.json."""

import json

from domain.function_rules import validate_catalog
from infrastructure.data_dir import FUNCTIONS_PATH


def read_catalog() -> list[dict]:
    if not FUNCTIONS_PATH.is_file():
        return []
    data = json.loads(FUNCTIONS_PATH.read_text())
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
    FUNCTIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
    FUNCTIONS_PATH.write_text(json.dumps(clean, indent=2) + "\n")
    return clean
