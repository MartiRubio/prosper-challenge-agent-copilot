"""Rewrite the spoken task of one step, or the agent's persona."""

import json

from application.copilot.agent_brief import brief_agent
from infrastructure.openai_client import complete_json
from infrastructure.prompt_files import get_prompt


def rewrite_task(body: dict) -> dict:
    target = body.get("target") if body.get("target") == "persona" else "step"
    node = body.get("node")
    if target == "step" and (not isinstance(node, str) or not node.strip()):
        raise ValueError("A step name is required.")
    content = body.get("content") if isinstance(body.get("content"), str) else ""
    message = body.get("message") if isinstance(body.get("message"), str) else ""
    agent = body.get("agent") if isinstance(body.get("agent"), dict) else {}
    user = json.dumps({
        **({"node": node.strip()} if target == "step" else {}),
        "content": content,
        "message": message.strip(),
        "agent": brief_agent(agent),
    }, indent=2)
    data = complete_json(get_prompt("persona_rewrite" if target == "persona" else "node_rewrite"), user)
    text = data.get("content")
    if not isinstance(text, str) or not text.strip():
        raise ValueError("The rewrite was empty.")
    return {"content": text.strip()}
