# Prosper Challenge — Agent Copilot

A voice agent is a graph of steps. The editor draws that graph, and the copilot proposes small changes you keep one by one.

```bash
make install
make api    # http://localhost:8000  agent documents and the copilot
make run    # http://localhost:7860  voice runner
make web    # http://localhost:5173  editor
```

`make run` on its own still serves the prebuilt client at `http://localhost:7860/client` and loads `backend/example_flow.json` when the call does not name an agent.

Put API keys in `backend/.env`. The copilot uses the same `OPENAI_API_KEY` as the voice pipeline.

## Layout

| Path | Responsibility |
| --- | --- |
| `frontend/` | The editor: graph, function catalog, test call, copilot chat, call log. |
| `backend/bot.py` | WebRTC, ElevenLabs speech, OpenAI. Compiles the agent it is given. |
| `backend/agent_builder/` | The JSON contract and the compile into Pipecat Flows. |
| `backend/domain/` | Pure agent rules: names, op order, applying ops, validation, what a tool looks like, the text model. |
| `backend/application/` | Use cases in three groups: `agents/`, `calls/` (the voice runtime), `copilot/`. |
| `backend/infrastructure/` | Adapters: OpenAI client, prompt files, agent, call, catalog and snapshot files, attachment text. |
| `backend/data/` | Everything stored, no database. See below. |
| `docs/samples/` | A sample client guideline, as .txt and .pdf, to attach in the copilot. |

`backend/data/` holds everything the app stores, grouped by what it belongs to:

```
data/
  functions.json              the shared function catalog
  prompts/<name>.md           every model prompt
  agents/<id>/
    agent.json                the agent
    sample_calls.json         mock production calls
    calls/<call id>.json      recorded test calls       (git-ignored)
    checks.json               the check of each call    (git-ignored)
    history/<stamp>.json      a full copy per save      (git-ignored)
  logs/llm/<stamp>.json       every prompt and answer   (git-ignored)
```
