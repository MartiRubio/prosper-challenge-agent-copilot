# Replay with a simulated caller

Replaying a call's exact lines stops working at the first turn that goes differently: the caller's next line answers a question the new agent never asked.

Replay instead extracts a caller brief from the flagged call: goal, facts, constraints, how they talk. A model plays that caller against the graph in text. `simulate_call` mirrors Pipecat Flows: the persona plus the current step's task, the step's arrows as tools (built by the same `domain.agent_rules.edge_tool` the voice runner uses), and a step marked end hangs up after it speaks.

The same brief calls the graph before and after the change. A judge returns pass or fail, and judges what the agent did in the steps it entered, not what it claimed. A replay that still fails can be sent back to the copilot as a new flagged call.

Text replay does not test speech recognition or barge-in. The voice test call stays the final check.
