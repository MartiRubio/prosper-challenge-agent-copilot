"""HTTP routes for the shared function catalog."""

from fastapi import APIRouter, Body, HTTPException

from application.agents.rename_function import cascade_function_name
from infrastructure.function_files import read_catalog, write_catalog

router = APIRouter(prefix="/functions", tags=["functions"])


@router.get("")
def get_functions() -> list[dict]:
    return read_catalog()


@router.post("/rename")
def post_rename(body: dict = Body(...)) -> dict:
    previous = body.get("from")
    name = body.get("to")
    skip = body.get("agent_id")
    if not isinstance(previous, str) or not isinstance(name, str):
        raise HTTPException(status_code=400, detail="from and to must be strings.")
    if skip is not None and not isinstance(skip, str):
        raise HTTPException(status_code=400, detail="agent_id must be a string.")
    try:
        cascade_function_name(previous, name, skip)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
    return {"from": previous, "to": name}


@router.put("")
def put_functions(body: list = Body(...)) -> list[dict]:
    try:
        return write_catalog(body)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
