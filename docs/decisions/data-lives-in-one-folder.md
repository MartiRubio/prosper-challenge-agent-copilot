# Data lives in one folder, grouped by agent

Stored data was spread over `agents/`, `functions.json`, `sample_calls/`, `history/`, `logs/` and `runtime/`. Everything now lives under `backend/data/`. The shared catalog and the prompts sit at the top. Each agent has its own folder holding its document, sample calls, recorded calls (one file per call), checks and history. The model logs are under `data/logs/`.

Everything about one agent is in one place, and deleting an agent removes its folder. Only `infrastructure/` knows these paths (`data_dir.py`), so moving to a database later means changing the adapters, not the use cases.
