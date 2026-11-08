"""HTTP routes for the shared function catalog."""

from fastapi import APIRouter, Body, HTTPException

from agent_builder.function_catalog import read_catalog, write_catalog

router = APIRouter(prefix="/functions", tags=["functions"])


@router.get("")
def get_functions() -> list[dict]:
    return read_catalog()


@router.put("")
def put_functions(body: list = Body(...)) -> list[dict]:
    try:
        return write_catalog(body)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from None
