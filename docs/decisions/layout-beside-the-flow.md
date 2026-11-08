# Layout sits beside the flow

Node positions live under a top-level `layout` key on the agent document:

```json
{ "layout": { "greeting": { "x": 0, "y": 80 } } }
```

`AgentBuilder.from_dict` only reads the fields Pipecat needs, so `layout` never reaches the voice runtime. The file store writes the document it was given after validation, which keeps `layout` on disk. Dragging a node updates the editor. It does not change what the caller hears.
