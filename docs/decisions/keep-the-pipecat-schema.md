# Keep the Pipecat schema

The agent document stays the JSON contract already implemented in `backend/agent_builder/schema.py`: a persona, a list of nodes, and edges as data (`function`, `description`, `target`, JSON-schema `properties`). `AgentBuilder` turns those strings into the closures Pipecat Flows wants.

We did not invent a second agent model for the editor. The file the editor saves is the file the voice runner compiles. A copilot, when we build one, can read and write the same document.
