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
| `backend/domain/` | Rules shared by every editor of an agent: names, op order, what a tool looks like. |
| `backend/application/` | One use case per file, including the copilot, call checks, and replay. |
| `backend/infrastructure/` | OpenAI client, agent files, call files, snapshots. |
| `backend/agents/` | Saved agent documents. |
| `backend/sample_calls/` | Mock production calls for the call log. |
| `backend/logs/` | Recorded test calls, call checks, and every copilot prompt and answer (git-ignored). |
| `backend/history/` | A snapshot of each agent per save (git-ignored). |
| `docs/samples/` | A sample client guideline, as .txt and .pdf, to attach in the copilot. |
