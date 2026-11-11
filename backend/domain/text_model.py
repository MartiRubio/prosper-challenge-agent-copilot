"""The one model every text generation uses.

The voice agent's default, the copilot, the call check, the replay caller and
judge all read this, so changing models is a one-line change. A simulated call
uses the agent's own `model` for the agent side, the same as a live call.
"""

TEXT_MODEL = "gpt-4o"
