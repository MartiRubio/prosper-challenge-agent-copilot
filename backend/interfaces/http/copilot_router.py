"""HTTP routes for the copilot."""

from fastapi import APIRouter, HTTPException, Query

from application.apply_patch import apply_ops
from application.copilot_edit import copilot_edit
from application.list_calls import list_calls
from application.rewrite_task import rewrite_task
from application.validate_agent import validate_generated

router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.post("/edit")
def post_edit(body: dict) -> dict:
    try:
        return copilot_edit(body)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error)) from None


@router.post("/rewrite")
def post_rewrite(body: dict) -> dict:
    try:
        return rewrite_task(body)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error)) from None


@router.post("/apply")
def post_apply(body: dict) -> dict:
    document = body.get("agent")
    ops = body.get("ops")
    catalog = body.get("catalog") if isinstance(body.get("catalog"), list) else []
    try:
        agent, functions = apply_ops(document, ops, catalog)
        names = {
            item.get("name")
            for item in functions
            if isinstance(item, dict) and isinstance(item.get("name"), str)
        }
        validate_generated(agent, names)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
    return {"agent": agent, "functions": functions}


@router.get("/calls")
def read_calls(agent_id: str = Query(default="")) -> list[dict]:
    return list_calls(agent_id)
