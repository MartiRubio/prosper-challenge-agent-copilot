"""Move a live test call to a node, carrying the caller's test data."""

from loguru import logger
from pipecat_flows.exceptions import FlowError

from application.track_active_node import track_active_node


def read_jump(message: object) -> tuple[str, dict[str, str]] | None:
    if not isinstance(message, dict) or message.get("type") != "client-message":
        return None
    data = message.get("data")
    if not isinstance(data, dict) or data.get("t") != "jump":
        return None
    payload = data.get("d")
    if not isinstance(payload, dict) or not isinstance(payload.get("node"), str):
        return None
    raw = payload.get("data")
    fields: dict[str, str] = {}
    if isinstance(raw, dict):
        for key, value in raw.items():
            if isinstance(key, str) and isinstance(value, str) and value.strip():
                fields[key] = value.strip()
    return payload["node"], fields


async def jump_to_node(flow_manager, context, builder, message: object) -> None:
    parsed = read_jump(message)
    if parsed is None:
        return
    node_name, data = parsed
    config = builder.node_config(node_name)
    if config is None:
        logger.info("Jump ignored, unknown node {}", node_name)
        return
    if data:
        flow_manager.state.update(data)
        known = ", ".join(f"{key} is {value}" for key, value in data.items())
        context.add_message({
            "role": "developer",
            "content": f"Known caller data for this test: {known}.",
        })
    try:
        await flow_manager.set_node_from_config(config)
    except FlowError:
        logger.exception("Could not jump to {}", node_name)
        return
    track_active_node(node_name)
