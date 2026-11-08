# The agent API sits beside the voice runner

The editor talks to a small FastAPI process on port 8000. The Pipecat development runner stays on port 7860 and keeps owning WebRTC.

We did not mount agent routes on the runner's app. The runner discovers `bot.py` and builds its own server. A second process keeps "save a document" and "place a call" as separate programs with separate failure modes. `make api`, `make run`, and `make web` start them.
