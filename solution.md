# Solution

The deployment team does two kinds of manual work. It turns a client's guidelines into an agent. Then it reads production calls, works out which step failed, and fixes it. Spotting the failing calls is part of that work.

This submission is a graph editor with a test call (Phase 1) and a copilot built around that second loop (Phase 2). The copilot works like a code review for agents. It never rewrites the agent. It proposes small, typed changes, draws them on the graph, and cites why each one exists. A person keeps or discards each change. Then the copilot shows whether the fix holds.

```
 guidelines (.txt/.pdf) ─┐
 a request in the chat ──┼─▶ copilot proposes ops ─▶ diff on the canvas ─▶ Keep / Discard ─▶ Save (snapshot)
 flagged calls ──────────┘          ▲  each op cites a quote                       │
                                    │                                               ▼
        Replay: before ✗ / after ✓ ◀┴── simulated caller ◀── test call ─▶ call log ─▶ automatic check flags the call
```

## The copilot

### 1. From guidelines to a first agent

Attach the client's guideline document (.txt, .md, or .pdf) and ask for an agent. This runs in two passes:

1. **Extract.** The copilot reads the document in overlapping slices and pulls out every specific, testable rule, including rules buried in table cells, FAQ answers, and the change log. A rule is kept only if its quote is really in the document. Duplicates are merged without losing names, times, ages, or thresholds.
2. **Copy and design.** The server copies the rules into the persona word for word, as the first card to review, so no rule is paraphrased away. The model only designs the graph, one change per path, with a dedicated step for every rule that changes where the call goes: emergencies, crisis lines, callers who may not book, handoffs.

The coverage list shows each rule, its quote, and where it lives. To test this, `docs/samples/lakeside-guidelines.pdf` hides 12 rules in 11 pages. A single-pass version caught 1 of them while reporting full coverage; the two-pass version caught 12 ([answer key](docs/samples/lakeside-guidelines-answer-key.md)).

### 2. From production calls to a fix

Every call in the Call log is checked by the copilot as soon as it appears. That includes a test call the moment it ends. The check says whether something went wrong, how serious it is, which step caused it, and quotes the line that shows it. The quoted line is outlined in the transcript, and the step can be sent to the copilot's focus with one click. A call with an issue is pre-flagged, with the check's feedback filled in. You edit the feedback or accept it, then choose Improve.

This targets the detection burden directly. Nobody has to read every transcript to find the bad ones.

### 3. Proving the fix holds

After you keep changes that came from flagged calls, Replay calls those calls again. It does not replay the caller's old lines, which go stale after the first turn that goes differently. It pulls the caller's goal and facts out of the call ("wants to cancel Thursday, does not want a new time"). A model plays that caller live, in text, against the graph. The simulator runs the graph the way Pipecat Flows does: the persona plus the current step's task, with the step's arrows as tools. A judge decides whether the flagged problem happened again. It judges what the agent did, not what it said it did: claiming a cancellation from a step that cannot cancel is a fail.

The same brief calls the graph before the change and after it, so you see **Before ✗ → After ✓** per call, with transcripts and the path of steps taken. A replay that still fails goes back to the copilot as a new flagged call in one click. While building this, replay caught a real defect: a cancel arrow that never fired, because a generic arrow on the same step matched first. The prompt now asks the copilot to narrow overlapping arrows.

### Why the output can be trusted

- **Ops, not rewrites.** The model returns typed operations (`add_node`, `add_edge`, `set_task`, …). The server applies them to a copy and validates the result. If the result is invalid, the server answers the model in the same conversation with its rejected answer and the exact error, up to three attempts. A retry leaves out the guideline text when the extracted rules already carry its quotes.
- **Shape checks.** Before a proposal reaches you, every arrow must point at a step that exists, every step must be reachable from Start, and no step can be a dead end. Every function must be in the catalog. Oversized changes are split. Problems that survive the retries show as a warning instead of failing the request.
- **Evidence is checked.** Each change quotes a call line, a guideline sentence, or your request, and the server checks that the quote really appears in its source. Cards show "In source" or "Not found in source".
- **Nothing is written until you say so.** Proposed changes are previewed on the canvas: added steps in green, rewrites in amber, removals faded and struck through. The canvas is read-only during a review. Functions the copilot adds are written to the catalog only when the agent is saved.
- **Every save is a snapshot.** History restores any earlier version as unsaved edits.

## Phase 1: the builder

An agent stays the JSON document `AgentBuilder` already compiles. The editor draws it as a graph. Start and End are markers; an arrow into End sets `end` on that step. Each arrow out of a step picks a function from a shared catalog, which owns the function's fields. A test call runs the graph currently on screen, saved or not. The runner pushes the active step over the WebRTC data channel and the canvas highlights it. Start from node opens a call on any step with test data filled in.

## Architecture

```
frontend (React, React Flow) ──▶ agent API :8000 (FastAPI) ──▶ backend/data/
           │                                │
           └── POST /start { agent } ──▶ voice runner :7860 (Pipecat) ──▶ AgentBuilder ──▶ Pipecat Flows
```

The backend is split by job:

- `domain/` holds the pure rules everyone shares: names, op order, applying ops, validating an agent, what a tool looks like for an arrow, and the one text model. Both the voice runner and the replay simulator build tools from the same function.
- `application/` has one use case per file, in three groups: `agents/` (create, save, versions…), `calls/` (load the agent for a call, announce the step, record the call) and `copilot/` (propose changes, check a call, replay, simulate, extract rules…).
- `infrastructure/` holds the adapters: the OpenAI client (every prompt and answer is logged under `data/logs/llm/` with the prompt's version), the prompt files, agent, call and catalog files, snapshots, and attachment text.
- `data/` is the store: the catalog, the prompts, one folder per agent with its calls, checks and history, and the model logs.
- `interfaces/http/` has one router per resource.

The voice pipeline is unchanged: browser mic → ElevenLabs STT → OpenAI → ElevenLabs TTS → browser.

## Scoping

| | What | Why |
| --- | --- | --- |
| **Built** | Guideline intake with coverage, call checks on arrival, evidence on every change, replay before/after, snapshots | These remove the work the brief describes: encoding guidelines, finding bad calls, finding the failing step, and trusting the fix. |
| **Mocked** | Production calls (`backend/data/agents/<id>/sample_calls.json`) | No real call data was provided. Three calls cover a routing bug, a safety miss, and a good call. Test calls are recorded and checked the same way. |
| **Left out** | Telephony, accounts, multi-user editing, call ingestion from a provider, dashboards | They don't change whether the copilot works. A real ingestion job would write to the same call files. |
| **Left out on purpose** | A copilot that regenerates the whole agent | Whole-agent rewrites are hard to review and break working paths. Small cited ops are slower to write but fast to trust. |

## Known limits

- Replay is text, not voice. It tests routing and wording, not speech recognition errors or barge-in. The live test call remains the final check.
- One model, gpt-4o, for all text generation (`domain/text_model.py`), with temperature 0 for checks and judging. Replay runs the agent side on the agent’s own model, as a live call does. Proposals still vary between runs; validation and retries bound that variance, they don't remove it.
- Test calls read the function catalog on disk. A function the copilot added is heard with its fields only after Save.
- Files instead of a database, and a single editor at a time.

## Running it

```bash
make install
make api    # http://localhost:8000  agent API and copilot
make run    # http://localhost:7860  voice runner
make web    # http://localhost:5173  editor
```

Keys go in `backend/.env` (`OPENAI_API_KEY`, `ELEVENLABS_API_KEY`). A sample guideline file is at `docs/samples/riverside-guidelines.pdf` (and `.txt`).

## Where the reasoning lives

- [docs/decisions/](docs/decisions/): one file per decision
- [docs/demo-script.md](docs/demo-script.md): the live walkthrough
- [docs/working-log.md](docs/working-log.md): the running log
