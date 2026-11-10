# Demo script — Phase 1

Three processes: `make api`, `make run`, `make web`. Open `http://localhost:5173`.

1. The Prosper Scheduler graph is on screen. Start connects to greeting, then collect details, offer times, and confirm, then End.
2. Double-click the greeting node. The spoken task opens as raw text or markdown, and the raw view can show tokens. Change it so the clinic name is obvious, for example "Riverside Family Medicine". The step name is edited in that same window. The agent name, in the left list, can be edited too. Prompt opens the persona the same way.
3. Save.
4. Place a test call. Allow the microphone. The call runs the graph on screen, so the greeting uses the line just edited. Save keeps that line in the file.
5. Click Test call. The button becomes Start, and Start from node appears to its left. Start begins at the greeting. Start from node shows the caller's intent, name, reason, and slot in place. Fill them and the steps pulse. Click confirm. The assistant should open on the confirmation, and that node lights up. A click during the call does not move it. The page does not poll for the active node.
6. End the call. Add a step, name it, and drag the + anchor to it. The function is chosen on that anchor: an existing function, or no_function. offer_times already has two arrows, one to confirm and one to callback. Remove clears the selection. Auto-arrange wraps the graph. Dragging a node does not enable Save.

## Phase 2

1. New agent. The canvas is Start and End only. In the chat, ask for a clinic scheduler that can book, reschedule, or cancel. Wait for the loading line. Added steps are green. Keep the cards you want. Discard all leaves the canvas empty. Save.
2. Open Prosper Scheduler. Shift-drag greeting and offer_times. Send to chat puts those names in the box and does not send by itself. Ask the chat to split cancel onto its own step. Keep that card. The new arrow stays on screen as a draft until you keep it.
3. Call log. The left half lists three sample calls. Open "Caller wanted to cancel". Flag it, and flag "Neither time worked", and write a line of feedback on each. Improve closes the log and opens the same review. Keep the change that stops a cancellation from being offered a new time. Save, then place one test call.
