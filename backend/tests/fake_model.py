"""A stand-in for the OpenAI adapter: scripted answers, and a record of what each call was sent.

Every model call in the backend goes through infrastructure/openai_client.py, and
each use case imports `complete_json` or `complete_chat` from it, so a test swaps
the name in the use case's module and nothing reaches the network.
"""

import json
from types import SimpleNamespace


class FakeJson:
    """Replaces complete_json. Answers are returned in order; the last one repeats."""

    def __init__(self, *answers: dict):
        self.answers = list(answers)
        self.calls: list[dict] = []

    def __call__(self, prompt, user, temperature=0.2, model=None, turns=None):
        self.calls.append({"prompt": prompt.name, "user": json.loads(user), "turns": turns or [], "temperature": temperature})
        index = min(len(self.calls), len(self.answers)) - 1
        return json.loads(json.dumps(self.answers[index]))


class FakeChat:
    """Replaces complete_chat. Agent turns get tools; caller turns don't."""

    def __init__(self, agent_replies: list, caller_replies: list[str]):
        self.agent_replies = list(agent_replies)
        self.caller_replies = list(caller_replies)
        self.agent_calls: list[dict] = []

    def __call__(self, messages, tools=None, temperature=0.3, model=None):
        if messages and "playing a caller" in messages[0]["content"]:
            return SimpleNamespace(content=self.caller_replies.pop(0), tool_calls=None)
        self.agent_calls.append({"messages": [dict(m) for m in messages], "tools": tools or [], "model": model})
        return self.agent_replies.pop(0)


def says(text: str):
    return SimpleNamespace(content=text, tool_calls=None)


def calls_tool(name: str):
    call = SimpleNamespace(id=f"call_{name}", function=SimpleNamespace(name=name, arguments="{}"))
    return SimpleNamespace(content=None, tool_calls=[call])
