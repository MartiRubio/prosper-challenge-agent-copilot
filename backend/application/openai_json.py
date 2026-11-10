"""One JSON completion for the copilot. The voice pipeline stays in bot.py."""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parent.parent / ".env", override=True)

_LOG_DIR = Path(__file__).resolve().parent.parent / "logs" / "llm"


def complete_json(system: str, user: str) -> dict:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        raise ValueError("OPENAI_API_KEY is not set.")
    client = OpenAI(api_key=key)
    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    raw = response.choices[0].message.content or "{}"
    _write_log(system, user, raw)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as error:
        raise ValueError("The model did not return JSON.") from error
    if not isinstance(data, dict):
        raise ValueError("The model did not return a JSON object.")
    return data


def _write_log(system: str, user: str, answer: str) -> None:
    _LOG_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    text = json.dumps({
        "at": stamp,
        "model": "gpt-4o",
        "system": system,
        "user": user,
        "answer": answer,
    }, indent=2)
    (_LOG_DIR / f"{stamp}.json").write_text(text)
    (_LOG_DIR / "latest.json").write_text(text)
