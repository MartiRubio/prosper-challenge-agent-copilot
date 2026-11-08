"""Agent API process."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from interfaces.http.agents_router import router as agents_router

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
