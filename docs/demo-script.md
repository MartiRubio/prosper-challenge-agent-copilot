# Demo script — Phase 1

Three processes: `make api`, `make run`, `make web`. Open `http://localhost:5173`.

1. The Prosper Scheduler graph is on screen. Start connects to greeting, then collect details, offer times, and confirm, then End.
2. Double-click the greeting node. The spoken task opens as raw text or markdown, and the raw view can show tokens. Change it so the clinic name is obvious, for example "Riverside Family Medicine". The step name is edited in that same window. The agent name, in the left list, can be edited too. Prompt opens the persona the same way.
3. Save.
4. Place a test call. Allow the microphone. The call runs the graph on screen, so the greeting uses the line just edited. Save keeps that line in the file.
5. Click Test call. The button becomes Start, and Start from node appears to its left. Start begins at the greeting. Start from node shows the caller's intent, name, reason, and slot in place. Fill them and the steps pulse. Click confirm. The assistant should open on the confirmation, and that node lights up. A click during the call does not move it. The page does not poll for the active node.
6. End the call. Add a step, name it, and draw an edge to it. The edge's function is a dropdown: an existing function, or no_function. Remove clears the selection. Auto-arrange wraps the graph and runs the next row back, so the turn is a short arrow and the names stay readable. Dragging a node does not enable Save.
