"""Choose the node a test call opens on."""

from application.calls.caller_data import caller_fields, share_caller_data


def opening_node(builder, body, flow_manager, context):
    node_name = builder.config.initial_node
    if isinstance(body, dict) and isinstance(body.get("start_node"), str):
        requested = body["start_node"]
        if builder.node_config(requested) is not None:
            node_name = requested
            share_caller_data(caller_fields(body.get("data")), flow_manager, context)
    return node_name, builder.node_config(node_name)
