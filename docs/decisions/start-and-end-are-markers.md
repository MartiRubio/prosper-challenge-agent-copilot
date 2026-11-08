# Start and End are markers

Start and End are drawn by the editor. They are not nodes in the agent file, and they have no spoken task.

Start has one outgoing edge. That edge is `initial_node`. Drawing it again points the call at a different first step.

An edge into End sets `end: true` on the step it leaves. `AgentBuilder` already turns that flag into Pipecat's `end_conversation` action. Removing the edge clears the flag. A step can also have edges to other steps; those stay function calls with a short description.
