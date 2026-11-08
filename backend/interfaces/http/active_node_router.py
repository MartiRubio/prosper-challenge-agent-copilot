"""HTTP route for the node a live call is in."""

from fastapi import APIRouter, HTTPException

from infrastructure.active_node_file import read_active_node
from infrastructure.agent_files import InvalidAgentId

router = APIRouter(prefix="/active-node", tags=["active-node"])


@router.get("/{agent_id}")
def get_active_node(agent_id: str) -> dict:
    try:
        return {"node": read_active_node(agent_id)}
    except InvalidAgentId:
        raise HTTPException(status_code=400, detail=f"Invalid agent id '{agent_id}'.") from None
