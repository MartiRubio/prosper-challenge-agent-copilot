"""Shared fixtures: a tiny agent, a catalog, and a throwaway data folder."""

import copy

import pytest

import infrastructure.agent_files as agent_files

CATALOG = [
    {
        "name": "choose_intent",
        "description": "Record what the caller wants.",
        "properties": {"intent": {"type": "string", "description": "What they want", "enum": ["book", "cancel"]}},
        "required": ["intent"],
    },
    {"name": "record_details", "description": "Record name and reason.", "properties": {}, "required": []},
]


def step(name: str, task: str = "Do the thing.", edges: list | None = None, end: bool = False) -> dict:
    node = {"name": name, "task_messages": [{"role": "developer", "content": task}], "edges": edges or []}
    if end:
        node["end"] = True
    return node


def arrow(function: str, target: str, description: str = "") -> dict:
    return {"function": function, "description": description, "target": target, "properties": {}, "required": []}


AGENT = {
    "name": "Test clinic",
    "persona": "You are a scheduling assistant.",
    "initial_node": "greeting",
    "nodes": [
        step("greeting", "Greet the caller.", [arrow("choose_intent", "collect", "When they say what they want.")]),
        step("collect", "Collect name and reason.", [arrow("record_details", "confirm")]),
        step("confirm", "Confirm and say goodbye.", end=True),
    ],
}


@pytest.fixture
def agent() -> dict:
    return copy.deepcopy(AGENT)


@pytest.fixture
def catalog() -> list:
    return copy.deepcopy(CATALOG)


@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    """Agents, calls and checks go to a temp folder; prompts are still read from data/prompts."""
    agents = tmp_path / "agents"
    agents.mkdir()
    monkeypatch.setattr(agent_files, "AGENTS_DIR", agents)
    return agents
