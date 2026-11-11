"""Test data a person typed for a call that starts mid-graph."""


def caller_fields(raw: object) -> dict[str, str]:
    fields: dict[str, str] = {}
    if not isinstance(raw, dict):
        return fields
    for key, value in raw.items():
        if isinstance(key, str) and isinstance(value, str) and value.strip():
            fields[key] = value.strip()
    return fields


def share_caller_data(fields: dict[str, str], flow_manager, context) -> None:
    """Put the fields in flow state and in front of the model."""
    if not fields:
        return
    flow_manager.state.update(fields)
    known = ", ".join(f"{key} is {value}" for key, value in fields.items())
    context.add_message({
        "role": "developer",
        "content": f"Known caller data for this test: {known}.",
    })
