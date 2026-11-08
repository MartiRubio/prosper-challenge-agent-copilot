"""Agent API process."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from interfaces.http.active_node_router import router as active_node_router
from interfaces.http.agents_router import router as agents_router
from interfaces.http.functions_router import router as functions_router

app = FastAPI(title="Prosper agent API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(agents_router)
app.include_router(functions_router)
app.include_router(active_node_router)
