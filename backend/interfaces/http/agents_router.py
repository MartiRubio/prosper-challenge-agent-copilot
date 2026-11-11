"""HTTP routes for agent documents."""

from fastapi import APIRouter, Body, HTTPException

from application.agent_versions import UnknownVersion, get_version, list_versions
from application.create_agent import create_agent
from application.delete_agent import delete_agent
from application.get_agent import get_agent
from application.list_agents import list_agents
from application.save_agent import save_agent
from infrastructure.agent_files import InvalidAgentId, UnknownAgent

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("")
def read_agents() -> list[dict]:
    return list_agents()


@router.post("")
def post_agent(body: dict | None = Body(default=None)) -> dict:
    name = None
    if body is not None:
        if "name" in body and not isinstance(body["name"], str):
            raise HTTPException(status_code=400, detail="name must be a string.")
        name = body.get("name")
    return create_agent(name)


@router.get("/{agent_id}")
def read_agent(agent_id: str) -> dict:
    try:
        return get_agent(agent_id)
    except UnknownAgent:
        raise HTTPException(status_code=404, detail=f"Unknown agent '{agent_id}'.") from None
    except InvalidAgentId:
        raise HTTPException(status_code=400, detail=f"Invalid agent id '{agent_id}'.") from None


@router.delete("/{agent_id}")
def remove_agent(agent_id: str) -> dict:
    try:
        delete_agent(agent_id)
    except UnknownAgent:
        raise HTTPException(status_code=404, detail=f"Unknown agent '{agent_id}'.") from None
    except InvalidAgentId:
        raise HTTPException(status_code=400, detail=f"Invalid agent id '{agent_id}'.") from None
    return {"deleted": agent_id}


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


@router.get("/{agent_id}/versions")
def read_versions(agent_id: str) -> list[dict]:
    try:
        return list_versions(agent_id)
    except UnknownAgent:
        raise HTTPException(status_code=404, detail=f"Unknown agent '{agent_id}'.") from None
    except InvalidAgentId:
        raise HTTPException(status_code=400, detail=f"Invalid agent id '{agent_id}'.") from None


@router.get("/{agent_id}/versions/{version_id}")
def read_version(agent_id: str, version_id: str) -> dict:
    try:
        return get_version(agent_id, version_id)
    except UnknownVersion:
        raise HTTPException(status_code=404, detail=f"Unknown version '{version_id}'.") from None
    except InvalidAgentId:
        raise HTTPException(status_code=400, detail=f"Invalid agent id '{agent_id}'.") from None
