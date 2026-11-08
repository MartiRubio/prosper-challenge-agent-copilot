# Next steps

Phase 1 is in the tree: the graph editor and a test call from that screen. The slices below are named only. Their files and commits get planned when each one starts.

1. **Brief, then graph.** Paste a client's scheduling guidelines. The model returns intents, slots, rules, and questions it will not guess. A person confirms the brief. Then it compiles an agent document.
2. **Patch from a call.** A mocked transcript becomes an issue pinned to one node, with a quote. The model proposes a minimal patch. The person accepts it. `AgentBuilder` validates before save.
3. **Text replay.** The failing utterance is run against the patched node's task and edges. The result is which function the node would call. The WebRTC call stays the final check.
4. **Demo dry run.** Walk [docs/demo-script.md](demo-script.md), then extend it with the brief and the patched call.
