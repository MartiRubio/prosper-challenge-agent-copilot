# Solution

Phase 1 is a local editor for the voice agent that already ships with this repo. An agent stays a JSON document. The editor draws that document as a graph. A step shows its name. Double-click opens the spoken task in the same raw and markdown editor as the prompt, including the token view. An edge picks a function from the shared catalog, or `no_function` when the step only continues. The catalog's fields are the test data. Start and End are fixed markers with no script: Start's edge is the first step, and an edge into End finishes the call. The agent name is edited in the list. The prompt opens in a raw view and a markdown view; the raw view can show how tiktoken splits it. Auto-arrange places the nodes left to right, then back across the next row, so the names stay readable and the turn between rows is a short arrow. Dragging a node stays on screen and is not written to the file. A test call runs the graph on screen, saved or not, and plays the bot's audio track in the page. The call tells the page which step it is in. Test call becomes Start, and Start from node asks for the fields those functions collect, then a click on a pulsing step opens the call there. A click during the call does not move it.

```
editor  ->  agent API  ->  backend/agents/*.json
editor  ->  POST /start { agent_id }  ->  bot.py  ->  AgentBuilder  ->  Pipecat Flows
```

The voice pipeline is unchanged: browser mic, ElevenLabs speech-to-text, OpenAI, ElevenLabs text-to-speech, browser speaker. `AgentBuilder` still compiles the JSON into a Pipecat Flows graph. The editor starts the call, hears which step the call entered, and can ask the call to jump to a step.

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

Accounts, telephony, and a call-recording pipeline. A second model provider. A JSON-schema editor: fields already stored on an edge stay in the file, and a newly drawn edge carries a short description the model can call. Version history and campaign analytics. The copilot itself.

## Where the reasoning lives

- [docs/decisions/](docs/decisions/) — one file per architecture decision
- [docs/demo-script.md](docs/demo-script.md) — the live walkthrough
- [docs/working-log.md](docs/working-log.md) — the running log of this interview
- [docs/next-steps.md](docs/next-steps.md) — what comes after Phase 1
