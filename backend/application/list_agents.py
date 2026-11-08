"""List saved agents."""

from infrastructure.agent_files import list_ids, read_document


def list_agents() -> list[dict]:
    agents = []
    for agent_id in list_ids():
        document = read_document(agent_id)
        agents.append({"id": agent_id, "name": document.get("name", agent_id)})
    return agents
