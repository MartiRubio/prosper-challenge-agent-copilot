"""Choose the node a test call opens on."""


def opening_node(builder, body, flow_manager, context):
    node_name = builder.config.initial_node
    if isinstance(body, dict) and isinstance(body.get("start_node"), str):
        requested = body["start_node"]
        if builder.node_config(requested) is not None:
            node_name = requested
            fields = _fields(body.get("data"))
            if fields:
                flow_manager.state.update(fields)
                known = ", ".join(f"{key} is {value}" for key, value in fields.items())
                context.add_message({
                    "role": "developer",
                    "content": f"Known caller data for this test: {known}.",
                })
    return node_name, builder.node_config(node_name)


def _fields(raw) -> dict[str, str]:
    fields: dict[str, str] = {}
    if not isinstance(raw, dict):
        return fields
    for key, value in raw.items():
        if isinstance(key, str) and isinstance(value, str) and value.strip():
            fields[key] = value.strip()
    return fields
