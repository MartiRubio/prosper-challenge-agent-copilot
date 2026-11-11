"""Simulate a batch of calls to an agent, with no model call to invent the callers.

Each call takes a call type from data/caller_profiles.json, fills its blanks
with random values, and runs the agent against a simulated caller playing it.
The calls are recorded beside the test calls with source "simulated", so the
call log checks them like any other call.
"""

import random
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

from application.copilot.simulate_call import simulate_call
from infrastructure.agent_files import agent_exists
from infrastructure.call_files import write_recorded
from infrastructure.function_files import catalog_by_name
from infrastructure.profile_files import read_caller_profiles

MAX_CALLS = 10
_BLANK = re.compile(r"\{(\w+)\}")


def simulate_calls(body: dict) -> list[dict]:
    agent_id = body.get("agent_id")
    agent = body.get("agent")
    if not isinstance(agent_id, str) or not agent_exists(agent_id):
        raise ValueError("Save the agent before simulating calls.")
    if not isinstance(agent, dict) or not agent.get("nodes"):
        raise ValueError("The agent has no steps to call.")
    count = body.get("count")
    if not isinstance(count, int) or not 1 <= count <= MAX_CALLS:
        raise ValueError(f"Simulate between 1 and {MAX_CALLS} calls.")
    catalog = catalog_by_name()
    for item in body.get("catalog") or []:
        if isinstance(item, dict) and isinstance(item.get("name"), str):
            catalog[item["name"]] = item
    profiles, values = read_caller_profiles()
    rng = random.Random()
    briefs = [_brief(profile, values, rng) for profile in _pick(profiles, count, rng)]
    with ThreadPoolExecutor(max_workers=5) as pool:
        runs = list(pool.map(lambda brief: simulate_call(agent, catalog, brief), briefs))
    stamp = datetime.now(timezone.utc)
    calls = []
    for index, (brief, run) in enumerate(zip(briefs, runs)):
        turns = [{"role": turn["role"], "text": turn["text"]} for turn in run["transcript"] if turn.get("text")]
        if not turns:
            continue
        started = stamp + timedelta(milliseconds=index)
        call = {
            "id": f"sim-{started.strftime('%Y%m%dT%H%M%S%fZ')}",
            "agent_id": agent_id,
            "title": brief["label"],
            "started_at": started.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "source": "simulated",
            "profile": brief["profile"],
            "brief": {key: brief[key] for key in ("goal", "facts", "constraints", "style")},
            "path": run["path"],
            "ended": run["ended"],
            "turns": turns,
            "agent": agent,
        }
        write_recorded(agent_id, call)
        calls.append({key: value for key, value in call.items() if key != "agent"})
    return calls


def _pick(profiles: list[dict], count: int, rng: random.Random) -> list[dict]:
    """Different call types first; repeat only once every type has been used."""
    picked: list[dict] = []
    while len(picked) < count:
        batch = profiles[:]
        rng.shuffle(batch)
        picked.extend(batch[: count - len(picked)])
    return picked


def _brief(profile: dict, values: dict[str, list[str]], rng: random.Random) -> dict:
    chosen = {key: rng.choice(options) for key, options in values.items()}

    def fill(text: str) -> str:
        return _BLANK.sub(lambda match: chosen.get(match.group(1), match.group(0)), text)

    name = f"{chosen.get('first_name', 'Alex')} {chosen.get('last_name', 'Smith')}"
    birth = datetime(1950, 1, 1) + timedelta(days=rng.randrange(0, 365 * 55))
    return {
        "profile": profile.get("id", ""),
        "label": profile.get("label") or profile.get("id", "Simulated call"),
        "goal": fill(profile["goal"]),
        "facts": {
            "name": name,
            "date_of_birth": birth.strftime("%B %-d, %Y"),
            "phone": f"555-{rng.randrange(100, 999)}-{rng.randrange(1000, 9999)}",
        },
        "constraints": [fill(item) for item in profile.get("constraints") or []],
        "style": profile.get("style", ""),
    }
