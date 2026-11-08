# Positions are not saved

Dragging a node moves it on the canvas only. Auto-arrange lays the graph out again from the edges, left to right, then back across the next row, so the turn between rows is a short step instead of a line across the canvas. Nothing about that layout is written into the agent file.

An older file may still contain a `layout` key. The editor ignores it. `AgentBuilder` never read it, so a saved position cannot change what the caller hears.
