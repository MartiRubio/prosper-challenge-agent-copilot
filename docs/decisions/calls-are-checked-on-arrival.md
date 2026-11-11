# Calls are checked when they arrive

The brief says finding bad calls is itself a burden. So the editor checks every call in the log without being asked: sample calls when the log first loads, and a test call as soon as it ends.

A check reads the transcript with the graph the call ran on (a test call stores it) and returns a status, a severity, the step that caused it, a quote, and what the agent should have done. Checks are stored in the agent’s `checks.json`, so each call is read once.

An issue pre-flags the call with its feedback, so Improve is one click. The person can still edit the feedback, unflag the call, or flag one the check missed.
