# A test call loads the agent by id

`bot()` already runs once per connection. It reads `agent_id` from the `/start` request body and opens `backend/agents/<id>.json` for that session.

The prebuilt client at `http://localhost:7860/client` does not send an id. When `agent_id` is missing, the bot still loads `backend/example_flow.json`, so the original quickstart keeps working.

The editor sends the id of the agent on screen. Saving and then calling cannot pick up a different file by accident.
