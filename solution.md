# Solution

Phase 1 is a local editor for the voice agent that already ships with this repo. An agent stays a JSON document. The editor draws that document as a graph. A step shows its name. Double-click opens the spoken task in the same raw and markdown editor as the prompt, including the token view. Each arrow out of a step picks a function from the shared catalog, on the anchor, or `no_function` when the step only continues. The catalog's fields are the test data. Start and End are fixed markers with no script: Start's edge is the first step, and an edge into End finishes the call. The agent name is edited in the list. The prompt opens in a raw view and a markdown view; the raw view can show how tiktoken splits it. Auto-arrange places the nodes left to right, then back across the next row, so the names stay readable and the turn between rows is a short arrow. Dragging a node stays on screen and is not written to the file. A test call runs the graph on screen, saved or not, and plays the bot's audio track in the page. The call tells the page which step it is in. Test call becomes Start, and Start from node asks for the fields those functions collect, then a click on a pulsing step opens the call there. A click during the call does not move it.

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

A step can have many arrows in and many arrows out. Each outgoing arrow is one function, chosen on the anchor, and one next step. `offer_times` can go to `confirm` or to `callback`. The compiled tool text names the step it continues to. The catalog owns a function's fields. An edge stores the function name and its target.

## Copilot

The chat sits to the left of the canvas. You describe a change, or shift-drag a part of the graph and send that selection into the box. The request always includes the whole agent. The model returns small changes, not a new agent. The canvas draws an added step or arrow in green, a rewritten line in amber, and a removal faded and struck through. Each card has Keep and Discard. Nothing is written until you keep it, and Save is still explicit.

Call log, in the stage header, lists sample calls for the scheduler. Flag any number of them, write what went wrong, and Improve opens the same review. A live test call is not added to that log.

## This leaves out

Accounts, telephony, and a real call-recording pipeline. A second model provider. Version history and campaign analytics.

## Where the reasoning lives

- [docs/decisions/](docs/decisions/) — one file per architecture decision
- [docs/demo-script.md](docs/demo-script.md) — the live walkthrough
- [docs/working-log.md](docs/working-log.md) — the running log of this interview
- [docs/next-steps.md](docs/next-steps.md) — what is in the tree
