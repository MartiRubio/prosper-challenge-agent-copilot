"""The compact view of an agent the copilot's prompts read."""

from domain.agent_rules import task_text


def brief_agent(document: dict) -> dict:
    nodes = []
    for node in document.get("nodes") or []:
        if not isinstance(node, dict):
            continue
        edges = [
            {
                "function": edge.get("function"),
                "description": edge.get("description"),
                "target": edge.get("target"),
            }
            for edge in node.get("edges") or []
            if isinstance(edge, dict)
        ]
        nodes.append({
            "name": node.get("name"),
            "task": task_text(node),
            "end": bool(node.get("end")),
            "edges": edges,
        })
    return {
        "name": document.get("name"),
        "persona": document.get("persona") or "",
        "initial_node": document.get("initial_node") or "",
        "nodes": nodes,
    }


def brief_function(item: dict) -> dict:
    return {
        "name": item.get("name"),
        "description": item.get("description") or "",
        "properties": item.get("properties") or {},
        "required": item.get("required") or [],
    }
