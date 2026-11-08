# Agents are JSON files

Each agent is one file under `backend/agents/<id>.json`. The id is the filename stem. There is no database.

That matches the starter, which was already "an agent is a JSON file", and it is enough for a single-user demo. The API is a thin read and write layer over that folder so the editor and the voice runner share one artifact.
