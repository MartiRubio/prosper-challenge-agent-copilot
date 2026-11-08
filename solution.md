# Solution

Phase 1 is a local editor for the voice agent that already ships with this repo. An agent stays a JSON document. The editor draws that document as a graph, lets a person change the nodes and the transitions, saves it back, and places a WebRTC test call against the open agent.

```
editor  ->  agent API  ->  backend/agents/*.json
editor  ->  POST /start { agent_id }  ->  bot.py  ->  AgentBuilder  ->  Pipecat Flows
```

The voice pipeline is unchanged: browser mic, ElevenLabs speech-to-text, OpenAI, ElevenLabs text-to-speech, browser speaker. `AgentBuilder` still compiles the JSON into a Pipecat Flows graph. The editor never talks to Pipecat directly except to start a call.

How to run it, once the processes exist:

```bash
make install
make api    # http://localhost:8000  agent documents
make run    # http://localhost:7860  voice runner
make web    # http://localhost:5173  editor
```

`make run` on its own still serves the prebuilt client at `http://localhost:7860/client` and still loads `backend/example_flow.json` when the call does not name an agent.

## Copilot, next

The deployment bottleneck is not drawing boxes. It is turning a client's guidelines into a graph, then changing one node when a real call goes wrong. The copilot we will build next proposes a small patch tied to a quote from those guidelines or from a call. A person accepts the patch before it is saved. That slice is named in [docs/next-steps.md](docs/next-steps.md) and is not in this tree yet.

## This slice leaves out

Accounts, telephony, and a call-recording pipeline. A second model provider. A JSON-schema IDE: collected fields are a name, a type, a description, and whether they are required. Version history and campaign analytics. The copilot itself.

## Where the reasoning lives

- [docs/decisions/](docs/decisions/) — one file per architecture decision
- [docs/demo-script.md](docs/demo-script.md) — the live walkthrough
- [docs/working-log.md](docs/working-log.md) — the running log of this interview
- [docs/next-steps.md](docs/next-steps.md) — what comes after Phase 1
