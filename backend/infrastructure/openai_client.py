"""OpenAI calls for the copilot. The voice pipeline keeps its own client in bot.py.

Every JSON call is written to data/logs/llm with the prompt's name and version,
so a surprising proposal can be read back exactly as the model saw it.
"""

import json
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from openai import OpenAI

from domain.text_model import TEXT_MODEL
from infrastructure.data_dir import DATA_DIR, LLM_LOG_DIR
from infrastructure.prompt_files import Prompt

_client: OpenAI | None = None


def complete_json(
    prompt: Prompt,
    user: str,
    temperature: float = 0.2,
    model: str = TEXT_MODEL,
    turns: list[dict] | None = None,
) -> dict:
    """One JSON object back from the model.

    `turns` continues the conversation after the first user message, for
    example the model's rejected answer and why it was rejected.
    """
    messages = [
        {"role": "system", "content": prompt.text},
        {"role": "user", "content": user},
        *(turns or []),
    ]
    response = _openai().chat.completions.create(
        model=model,
        temperature=temperature,
        response_format={"type": "json_object"},
        messages=messages,
    )
    raw = response.choices[0].message.content or "{}"
    _write_log({
        "model": model,
        "prompt": prompt.name,
        "prompt_version": prompt.version,
        "system": prompt.text,
        "user": user,
        "turns": turns or [],
        "answer": raw,
    })
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as error:
        raise ValueError("The model did not return JSON.") from error
    if not isinstance(data, dict):
        raise ValueError("The model did not return a JSON object.")
    return data


def complete_chat(
    messages: list[dict],
    tools: list[dict] | None = None,
    temperature: float = 0.3,
    model: str = TEXT_MODEL,
):
    """One chat turn, optionally with tools. Returns the assistant message."""
    kwargs: dict = {"model": model, "temperature": temperature, "messages": messages}
    if tools:
        kwargs["tools"] = tools
    response = _openai().chat.completions.create(**kwargs)
    return response.choices[0].message


def _openai() -> OpenAI:
    global _client
    if _client is None:
        load_dotenv(DATA_DIR.parent / ".env", override=True)
        key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not key:
            raise ValueError("OPENAI_API_KEY is not set.")
        _client = OpenAI(api_key=key)
    return _client


def _write_log(entry: dict) -> None:
    LLM_LOG_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    text = json.dumps({"at": stamp, **entry}, indent=2)
    (LLM_LOG_DIR / f"{stamp}.json").write_text(text)
    (LLM_LOG_DIR / "latest.json").write_text(text)
