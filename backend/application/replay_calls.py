"""Replay flagged calls against the graph before and after a change.

Each flagged call becomes a caller brief once. The same brief then calls both
graphs, and a judge says whether the flagged problem happened again.
"""

import json
from concurrent.futures import ThreadPoolExecutor

from agent_builder.function_catalog import catalog_by_name
from application.agent_brief import brief_agent
from application.prompts import REPLAY_JUDGE, REPLAY_SCENARIO
from application.simulate_call import simulate_call
from infrastructure.openai_client import complete_json

_MAX_CALLS = 4


def replay_calls(body: dict) -> list[dict]:
    before = body.get("agent_before")
    after = body.get("agent_after")
    if not isinstance(before, dict) or not isinstance(after, dict):
        raise ValueError("agent_before and agent_after must be objects.")
    calls = [call for call in body.get("calls") or [] if isinstance(call, dict)][:_MAX_CALLS]
    if not calls:
        raise ValueError("Flag at least one call to replay.")
    catalog = _catalog(body.get("catalog"))

    with ThreadPoolExecutor(max_workers=8) as pool:
        briefs = list(pool.map(lambda call: _brief(call, before), calls))
        runs = {
            (index, label): pool.submit(_run, agent, catalog, briefs[index], call)
            for index, call in enumerate(calls)
            for label, agent in (("before", before), ("after", after))
        }
        results = []
        for index, call in enumerate(calls):
            results.append({
                "call_id": call.get("id"),
                "title": call.get("title") or call.get("id"),
                "brief": briefs[index],
                "before": runs[(index, "before")].result(),
                "after": runs[(index, "after")].result(),
            })
    return results


def _catalog(raw: object) -> dict[str, dict]:
    catalog = catalog_by_name()
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, dict) and isinstance(item.get("name"), str):
                catalog[item["name"]] = item
    return catalog


def _brief(call: dict, agent: dict) -> dict:
    payload: dict = {"feedback": call.get("feedback") or "", "transcript": call.get("turns") or []}
    guess_start = call.get("source") == "test" and not call.get("start_node")
    if guess_start:
        payload["steps"] = [
            {"name": step["name"], "task": step["task"]} for step in brief_agent(agent)["nodes"]
        ]
    brief = complete_json(REPLAY_SCENARIO, json.dumps(payload, indent=2), temperature=0)
    start = call.get("start_node") if isinstance(call.get("start_node"), str) else ""
    if not start and guess_start and isinstance(brief.get("start_step"), str):
        start = brief["start_step"]
    brief["start_step"] = start
    return brief


def _start(call: dict, brief: dict) -> tuple[str | None, dict[str, str]]:
    start = brief.get("start_step") or None
    known = call.get("test_data") if isinstance(call.get("test_data"), dict) else {}
    if start and not known:
        facts = brief.get("facts") if isinstance(brief.get("facts"), dict) else {}
        known = {str(key): str(value) for key, value in facts.items() if value}
    return start, known


def _run(agent: dict, catalog: dict[str, dict], brief: dict, call: dict) -> dict:
    start, known = _start(call, brief)
    simulation = simulate_call(agent, catalog, brief, start, known)
    verdict = complete_json(REPLAY_JUDGE, json.dumps({
        "agent": brief_agent(agent),
        **({"started_at_step": start, "test_data": known} if start else {}),
        "feedback": call.get("feedback") or "",
        "check": call.get("check"),
        "brief": brief,
        "steps": simulation["path"],
        "ended": simulation["ended"],
        "transcript": simulation["transcript"],
    }, indent=2), temperature=0)
    return {
        "passed": verdict.get("passed") is True,
        "reason": verdict.get("reason") if isinstance(verdict.get("reason"), str) else "",
        **simulation,
    }
