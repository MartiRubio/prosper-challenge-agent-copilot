"""OpenAI calls for the copilot. The voice pipeline keeps its own client in bot.py.

Every prompt and answer is written to logs/llm, so a surprising proposal can be
read back exactly as the model saw it.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

COPILOT_MODEL = "gpt-4o"

_BACKEND = Path(__file__).resolve().parent.parent
_LOG_DIR = _BACKEND / "logs" / "llm"
_client: OpenAI | None = None


def complete_json(system: str, user: str, temperature: float = 0.2) -> dict:
    """One JSON object back from the model."""
    response = _openai().chat.completions.create(
        model=COPILOT_MODEL,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    raw = response.choices[0].message.content or "{}"
    _write_log({"system": system, "user": user, "answer": raw})
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as error:
        raise ValueError("The model did not return JSON.") from error
    if not isinstance(data, dict):
        raise ValueError("The model did not return a JSON object.")
    return data


def complete_chat(messages: list[dict], tools: list[dict] | None = None, temperature: float = 0.3):
    """One chat turn, optionally with tools. Returns the assistant message."""
    kwargs: dict = {"model": COPILOT_MODEL, "temperature": temperature, "messages": messages}
    if tools:
        kwargs["tools"] = tools
    response = _openai().chat.completions.create(**kwargs)
    return response.choices[0].message


def _openai() -> OpenAI:
    global _client
    if _client is None:
        load_dotenv(_BACKEND / ".env", override=True)
        key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not key:
            raise ValueError("OPENAI_API_KEY is not set.")
        _client = OpenAI(api_key=key)
    return _client


def _write_log(entry: dict) -> None:
    _LOG_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    text = json.dumps({"at": stamp, "model": COPILOT_MODEL, **entry}, indent=2)
    (_LOG_DIR / f"{stamp}.json").write_text(text)
    (_LOG_DIR / "latest.json").write_text(text)
