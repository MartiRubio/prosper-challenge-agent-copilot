"""HTTP routes that read agent documents."""

from fastapi import APIRouter, HTTPException

from application.get_agent import get_agent
from application.list_agents import list_agents
from infrastructure.agent_files import InvalidAgentId, UnknownAgent

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("")
def read_agents() -> list[dict]:
    return list_agents()


@router.get("/{agent_id}")
def read_agent(agent_id: str) -> dict:
    try:
        return get_agent(agent_id)
    except UnknownAgent:
        raise HTTPException(status_code=404, detail=f"Unknown agent '{agent_id}'.") from None
    except InvalidAgentId:
        raise HTTPException(status_code=400, detail=f"Invalid agent id '{agent_id}'.") from None
