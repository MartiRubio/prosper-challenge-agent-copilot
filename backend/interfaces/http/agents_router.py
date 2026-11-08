"""HTTP routes for agent documents."""

from fastapi import APIRouter, HTTPException

from application.get_agent import get_agent
from application.list_agents import list_agents
from application.save_agent import save_agent
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


@router.put("/{agent_id}")
def put_agent(agent_id: str, document: dict) -> dict:
    try:
        return save_agent(agent_id, document)
    except UnknownAgent:
        raise HTTPException(status_code=404, detail=f"Unknown agent '{agent_id}'.") from None
    except InvalidAgentId:
        raise HTTPException(status_code=400, detail=f"Invalid agent id '{agent_id}'.") from None
    except (KeyError, TypeError, ValueError) as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
