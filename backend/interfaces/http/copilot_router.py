"""HTTP routes for the copilot."""

from fastapi import APIRouter, Body, HTTPException, Query

from application.calls.list_calls import list_calls
from application.copilot.apply_changes import apply_changes
from application.copilot.check_call import UnknownCall, check_call
from application.copilot.generate_test_data import generate_test_data
from application.copilot.propose_changes import propose_changes
from application.copilot.replay_calls import replay_calls
from application.copilot.rewrite_task import rewrite_task
from infrastructure.agent_files import InvalidAgentId
from infrastructure.attachment_text import extract_attachment

router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.post("/edit")
def post_edit(body: dict) -> dict:
    return _model_call(propose_changes, body)


@router.post("/rewrite")
def post_rewrite(body: dict) -> dict:
    return _model_call(rewrite_task, body)


@router.post("/test-data")
def post_test_data(body: dict) -> dict:
    return _model_call(generate_test_data, body)


@router.post("/apply")
def post_apply(body: dict) -> dict:
    catalog = body.get("catalog") if isinstance(body.get("catalog"), list) else []
    try:
        agent, functions = apply_changes(body.get("agent"), body.get("ops"), catalog)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
    return {"agent": agent, "functions": functions}


@router.post("/attachment")
def post_attachment(body: dict = Body(...)) -> dict:
    try:
        return extract_attachment(body.get("name"), body.get("data"))
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None


@router.get("/calls")
def read_calls(agent_id: str = Query(default="")) -> list[dict]:
    return list_calls(agent_id)


@router.post("/calls/{agent_id}/{call_id}/check")
def post_check(agent_id: str, call_id: str) -> dict:
    try:
        return _model_call(check_call, agent_id, call_id)
    except UnknownCall:
        raise HTTPException(status_code=404, detail=f"Unknown call '{call_id}'.") from None
    except InvalidAgentId:
        raise HTTPException(status_code=400, detail=f"Invalid agent id '{agent_id}'.") from None


@router.post("/replay")
def post_replay(body: dict) -> list[dict]:
    return _model_call(replay_calls, body)


def _model_call(action, *args):
    """Bad input is a 400; a failing model or network call is a 502."""
    try:
        return action(*args)
    except (UnknownCall, InvalidAgentId):
        raise
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error)) from None
