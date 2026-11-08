# One concept per file, one purpose per commit

New backend code is split by job:

- `application/<use_case>.py` — one use case, one function
- `infrastructure/agent_files.py` — read and write agent JSON
- `infrastructure/active_node_file.py` — the live node during a call
- `interfaces/http/` — one router per resource, and `app.py` only builds the process

The frontend mirrors that. `TaskEditor.tsx` edits the spoken task. `startWebRtcCall.ts` starts the call. `App.tsx` only composes the page.

`backend/agent_builder/` and `bot.py` stay where the starter put them. Moving them would be a rename with no product change. `bot.py` calls application code. It does not grow a second job.

Commits follow the same rule. Each commit is one purpose: the read API, then save, then create, then the canvas, then the inspector. A reviewer can read the history without a three-thousand-line diff.
