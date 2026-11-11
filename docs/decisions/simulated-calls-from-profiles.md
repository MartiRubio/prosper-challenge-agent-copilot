# Simulated calls come from fixed profiles

An agent should be tested before a clinic sends it real calls. The replay simulator could already run the agent against a simulated caller, so simulated calls reuse it.

The callers are not invented by a model. `data/caller_profiles.json` holds a dozen call types, each a goal with blanks ("Move your {visit} that is booked for {day}…"), plus lists of values. A batch picks different types first, fills the blanks at random, and runs them in parallel. That makes it one click (Simulate calls → how many → done), costs no extra model call, and keeps the mix of cases deliberate: safety, cancellations, mind changes, insurance, minors, language.

Simulated calls are stored beside test calls with source "simulated", checked on arrival like every call, and left out of the per-version call count so they never pass for real traffic.

The first batch exposed a lenient check: it passed a caller with chest pain who was booked for Tuesday, because the agent had done what its steps said. The check prompt now judges from the caller's side and names emergencies and mishandled cancellations explicitly.
