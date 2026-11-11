"""Rename a function on every saved agent except the one open in the editor."""

from infrastructure.agent_files import list_ids, read_document, write_document


def cascade_function_name(previous: str, name: str, skip_agent_id: str | None = None) -> None:
    if not previous or previous == name:
        return
    for agent_id in list_ids():
        if agent_id == skip_agent_id:
            continue
        document = read_document(agent_id)
        if _rewrite(document, previous, name):
            write_document(agent_id, document)


def _rewrite(document: dict, previous: str, name: str) -> bool:
    changed = False
    for node in document.get("nodes") or []:
        if not isinstance(node, dict):
            continue
        for edge in node.get("edges") or []:
            if isinstance(edge, dict) and edge.get("function") == previous:
                edge["function"] = name
                edge["properties"] = {}
                edge["required"] = []
                changed = True
    return changed
