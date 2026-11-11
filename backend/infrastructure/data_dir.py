"""Where everything the app stores lives: backend/data/.

data/
  functions.json              the shared function catalog
  caller_profiles.json        call types and values for simulated calls
  prompts/<name>.md           every model prompt
  agents/<id>/
    agent.json                the agent
    sample_calls.json         mocked production calls
    calls/<call id>.json      recorded test calls
    checks.json               the copilot's check of each call
    history/<stamp>.json      a full copy per save
  logs/llm/<stamp>.json       every prompt and answer
"""

from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
AGENTS_DIR = DATA_DIR / "agents"
FUNCTIONS_PATH = DATA_DIR / "functions.json"
CALLER_PROFILES_PATH = DATA_DIR / "caller_profiles.json"
PROMPTS_DIR = DATA_DIR / "prompts"
LLM_LOG_DIR = DATA_DIR / "logs" / "llm"
