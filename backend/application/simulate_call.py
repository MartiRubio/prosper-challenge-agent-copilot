"""Run an agent graph as a text conversation against a simulated caller.

This mirrors what Pipecat Flows does on a voice call: the agent sees the persona
and the current step's task, the step's arrows are its tools, and calling a
tool moves it to the arrow's target. A step marked end hangs up once the agent
has spoken in it. The caller is another model playing a brief, so the
conversation can go somewhere new instead of replaying stale lines.
"""

import json

from application.prompts import REPLAY_CALLER
from domain.agent_rules import edge_tool, task_text
from infrastructure.openai_client import complete_chat

_HANG_UP = "[HANG UP]"
_MAX_HOPS = 3


def simulate_call(
    agent: dict,
    catalog: dict[str, dict],
    brief: dict,
    start_node: str | None = None,
    known: dict[str, str] | None = None,
    max_exchanges: int = 8,
) -> dict:
    """Start where the original call started; a test from a later step also hands over its test data."""
    nodes = {node.get("name"): node for node in agent.get("nodes") or [] if isinstance(node, dict)}
    current = start_node if start_node in nodes else agent.get("initial_node")
    if current not in nodes:
        return {"transcript": [], "path": [], "ended": "no_start"}
    persona = agent.get("persona") or ""
    messages: list[dict] = []
    if current != agent.get("initial_node") and known:
        # Mirrors application.caller_data.share_caller_data on a live call.
        facts = ", ".join(f"{key} is {value}" for key, value in known.items())
        messages.append({"role": "system", "content": persona})
        messages.append({"role": "developer", "content": f"Known caller data for this test: {facts}."})
    _enter(messages, nodes[current], persona)
    path = [current]
    transcript: list[dict] = []

    for _ in range(max_exchanges):
        current, said = _agent_turn(messages, nodes, current, catalog, persona, path)
        if said:
            transcript.append({"role": "agent", "text": said, "step": current})
        if nodes[current].get("end") and said:
            return {"transcript": transcript, "path": path, "ended": "agent"}
        reply, hung_up = _caller_turn(brief, transcript)
        if reply:
            transcript.append({"role": "caller", "text": reply})
            messages.append({"role": "user", "content": reply})
        if hung_up:
            return {"transcript": transcript, "path": path, "ended": "caller"}
    return {"transcript": transcript, "path": path, "ended": "turn_limit"}


def _enter(messages: list[dict], node: dict, persona: str) -> None:
    role = node.get("role_message") or persona
    if role and not any(item.get("content") == role for item in messages if item.get("role") == "system"):
        messages.append({"role": "system", "content": role})
    messages.append({"role": "system", "content": task_text(node)})


def _agent_turn(messages, nodes, current, catalog, persona, path) -> tuple[str, str]:
    for _ in range(_MAX_HOPS):
        node = nodes[current]
        tools = [edge_tool(edge, catalog) for edge in node.get("edges") or [] if isinstance(edge, dict)]
        reply = complete_chat(messages, [_openai_tool(tool) for tool in tools] or None)
        calls = reply.tool_calls or []
        if not calls:
            text = (reply.content or "").strip()
            messages.append({"role": "assistant", "content": text})
            return current, text
        messages.append({
            "role": "assistant",
            "content": reply.content or None,
            "tool_calls": [
                {"id": call.id, "type": "function", "function": {"name": call.function.name, "arguments": call.function.arguments}}
                for call in calls
            ],
        })
        taken = next((tool for tool in tools if tool["name"] == calls[0].function.name), None)
        for index, call in enumerate(calls):
            status = "success" if index == 0 and taken else "ignored"
            messages.append({"role": "tool", "tool_call_id": call.id, "content": json.dumps({"status": status})})
        if taken is None or taken["target"] not in nodes:
            continue
        current = taken["target"]
        path.append(current)
        _enter(messages, nodes[current], persona)
    return current, ""


def _caller_turn(brief: dict, transcript: list[dict]) -> tuple[str, bool]:
    messages = [{"role": "system", "content": REPLAY_CALLER.replace("{brief}", json.dumps(brief, indent=2))}]
    for turn in transcript:
        role = "user" if turn["role"] == "agent" else "assistant"
        messages.append({"role": role, "content": turn["text"]})
    reply = complete_chat(messages, temperature=0.5)
    text = (reply.content or "").strip()
    hung_up = _HANG_UP in text
    return text.replace(_HANG_UP, "").strip(), hung_up


def _openai_tool(tool: dict) -> dict:
    return {
        "type": "function",
        "function": {
            "name": tool["name"],
            "description": tool["description"],
            "parameters": {
                "type": "object",
                "properties": tool["properties"],
                "required": tool["required"],
            },
        },
    }
