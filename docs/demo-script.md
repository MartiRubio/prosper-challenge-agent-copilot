# Demo script — Phase 1

Three processes: `make api`, `make run`, `make web`. Open `http://localhost:5173`.

1. The Prosper Scheduler graph is on screen. Greeting connects to collect details, then offer times, then confirm.
2. Select the greeting node. Change the spoken task so the clinic name is obvious, for example "Riverside Family Medicine".
3. Save.
4. Place a test call. Allow the microphone. The assistant should greet with the line just saved.
5. Talk far enough to book the Tuesday slot. The canvas highlights the node the call is in.

Step 5 depends on the active-node commit. Until that commit, stop after the greeting and say the highlight is next.
