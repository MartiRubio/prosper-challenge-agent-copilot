# The copilot proposes cited ops

The copilot never returns a new agent. It returns changes, each made of typed ops (`add_node`, `add_edge`, `set_task`, `set_edge`, `add_function`, …), and each change cites evidence: a call line, a guideline sentence, or the request.

The server applies all ops to a copy, validates the result, and checks the shape of the graph: every arrow lands on a step that exists, every step is reachable from Start, no step is a dead end, and no change is too large to review. Errors go back to the model verbatim, up to three attempts. Shape problems that survive come back as warnings instead of failing the request.

Each quote is matched against its source, ignoring spacing and punctuation, and the card says whether it was found.

A whole-agent rewrite would be simpler to generate, but harder to review, and it breaks paths that worked. Small cited ops are what a reviewer can trust quickly.
