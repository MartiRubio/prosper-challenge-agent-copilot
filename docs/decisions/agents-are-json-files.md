# Agents are JSON files

Each agent is one file, `backend/data/agents/<id>/agent.json`. The id is the folder name, and the folder also holds that agent’s calls, checks and history. There is no database.

That matches the starter, which was already "an agent is a JSON file", and it is enough for a single-user demo. The API is a thin read and write layer over that folder so the editor and the voice runner share one artifact.
