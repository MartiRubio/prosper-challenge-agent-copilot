"""What makes a valid shared function catalog.

A function lives in the catalog, not on one agent. An edge names it. The
fields on the function are the data a test call has to supply.
"""

from domain.agent_rules import clean_properties, is_valid_name


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

