# Working log

A running log for this interview. Edit it as decisions change. Entries are distilled from the conversation, not a transcript.

## 2026-11-08 — What we started from

The repo is a voice runtime, not a product. `backend/example_flow.json` is a clinic scheduler. `AgentBuilder` validates that JSON and compiles it into Pipecat Flows. `bot.py` runs ElevenLabs speech-to-text, OpenAI, and ElevenLabs text-to-speech over WebRTC. The prebuilt client is `http://localhost:7860/client`. The example agent sends book, reschedule, and cancel down the same path. That bug is a useful seed for the copilot later. We are not fixing it in Phase 1.

API keys are in `backend/.env`. They are not committed.

## 2026-11-08 — Product direction

Phase 2, later, is the part Prosper said they care about. The copilot should not be a chat box that rewrites the whole agent. Deployment time is lost encoding guidelines into a graph, and finding which node a bad call indicts. The copilot will propose a small patch tied to a quote. A person accepts it before it is saved. New agents go through a confirmed brief first. A failing line from a call can be replayed as text against the patched node, with the voice call as the final check.

## 2026-11-08 — How we are building

We are doing Phase 1 first: the graph editor and a test call from that UI. Commits stay single-purpose so the history is reviewable. Files stay single-concept. The filename is the job. New backend code is application, infrastructure, and HTTP interfaces. The Pipecat schema and `bot.py` stay put.

The review surface is `solution.md`, `docs/decisions/`, `docs/demo-script.md`, this log, and `docs/next-steps.md`.

## 2026-11-08 — Phase 1 is in the tree

The editor lists agents, draws the graph, edits a node's task and edges, saves, and creates a blank agent. Test call uses the Pipecat browser client against `POST /start` with `agent_id`. A live check loaded `prosper-scheduler.json`, greeted from the greeting node, highlighted that node, and cleared the highlight when the call ended. The prebuilt client at `:7860/client` still runs when no id is sent.

Next slice is the copilot, still unscoped: brief, then a patch from a mocked call, then a text replay.

## 2026-11-08 — Editor pass after using it

The test call was silent in the editor. The runner was already synthesizing speech and sending it on the WebRTC track. Chrome plays that remote track through an audio element; wiring it only into an AudioContext stays silent. The page now starts an audio element on the click and plays the bot track there.

Dragging a node no longer marks the agent dirty and no longer writes `layout`. Auto-arrange places Start, the steps, and End from the edges.

The side panel is the step's name and spoken task. Edges are drawn on the canvas and removed there. Start and End are fixed markers with no script. Start's edge is `initial_node`. An edge into End sets `end` on that step, which the builder already compiles as the end of the call.

## 2026-11-08 — Editing lives on the graph

Dragging flickered because every pixel wrote React state and rebuilt the nodes, so React Flow restarted the gesture. Positions now stay in the canvas until the graph structure changes. The active-node poll also stopped re-rendering when the node had not changed.

The right-hand inspector is gone. A step's name and spoken task sit on the node. An edge's function name, and when it is selected the description of when to call it, sit on the line. Remove, under Auto-arrange, deletes the selection. The agent name is edited in the list. Prompt opens the persona as raw text or rendered markdown, and the raw view can color tiktoken's tokens. That toggle starts off.

## 2026-11-08 — The call reports its own step

The editor was asking `GET /active-node/{id}` twice a second whether or not a call was up. The voice runner now pushes the node name on the WebRTC data channel the call already uses. The highlight follows that message. Nothing polls.

An edge's label is a dropdown of the functions already defined on the agent, plus `no_function` for a plain continuation. Taking the edge is the function call, so the canvas does not ask for a separate "when to call it" sentence. A plain edge still carries a short description in the file, because the model takes the edge by calling that tool.

Test data is the fields those functions collect. Once they are filled, clicking a step during a call moves the live conversation there and puts that data in front of the model.

## 2026-11-08 — Functions are shared

Functions were whatever an edge already used, so a new agent had no way to add one. They now live in `backend/functions.json`. Agents and Functions are two menus in the left bar. Every agent picks from that list. A function's fields are the test data. The token colors draw inside the prompt editor. An agent can be deleted from the list.

## 2026-11-08 — The graph reads left to right

A step shows its name. Double-click opens the spoken task in the same raw and markdown editor as the prompt, tokens included, and the step can be renamed there. Auto-arrange places Start on the left and End on the right.

## 2026-11-08 — Start from a step

A click during a live call does not move the conversation. Test call first becomes Start, and Start from node slides out to its left. That button opens the test fields in place. When they are filled, the steps pulse, and clicking one starts the call there. The runner opens on that step with the field values already in front of the model.

## 2026-11-08 — The call uses the screen

A test call was reading the saved file, so unsaved edits could not be heard, and the button had to be saved first. The editor now sends the graph on screen with the start request. Save still writes the file. Test data sits next to Test call, and that button stays in place when it becomes Start. Auto-arrange wraps the row so the step names stay large. The next row runs back the other way, so the arrow into that row stays as short as the others. The controls use Lucide icons, colored by what they open.

## 2026-11-09 — Copilot

A step's outgoing arrows each carry one function, chosen on the anchor rather than on the line. offer_times now branches to confirm or callback. The tool text the model hears names the next step.

The copilot chat sits left of the canvas. It proposes small changes. The canvas colors what would be added, rewritten, or removed, and each card can be kept or discarded. Call log lists sample calls for the scheduler. Flagging several and choosing Improve uses that same review. Save is still explicit. A new agent opens as Start and End only.

## 2026-11-11 — Closing the loop

A review against the brief found three gaps: nobody detects bad calls but a person, a fix is never shown to hold, and guidelines arrive as documents, not chat. Calls are now checked by the copilot when they appear, and issues pre-flag them. Replay calls flagged calls again with a simulated caller, before and after the change. Guideline files can be attached, and a draft shows which rules it covers. Every change cites its evidence and the quote is checked against the source. Every save keeps a snapshot.

Replay found a real bug while it was being built: catalog descriptions overrode the per-arrow description, so a generic intent arrow swallowed "cancel". The arrow's own description now wins.

Shared rules moved to `backend/domain/`, adapters to `infrastructure/`. The editor was rebuilt around the copilot: a full-height panel, a call log drawer over the canvas, one set of color tokens.
