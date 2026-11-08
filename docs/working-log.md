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
