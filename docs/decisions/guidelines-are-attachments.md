# Guidelines are attachments, and rules come out first

A client’s guidelines arrive as a document, not a chat message. The copilot takes .txt, .md and .pdf files (PDF text via `pypdf`, capped at 40,000 characters), and the file stays attached for follow-up requests.

## Why two passes

The first version asked the model to read the document and design the graph in one go, and to report which rules it covered. On `docs/samples/lakeside-guidelines.pdf`, 11 pages with 12 rules buried in table cells, the FAQ and the change log, it caught 1 of 12, while reporting full coverage: it listed section titles as rules. Asking it to also copy rules into the persona raised that to 8, but it paraphrased the specifics away (“under eighteen”, “never with a physician”), and a model-based audit was too lenient to notice.

So the work is split by what each step is good at:

1. **Extract** (`extract_rules`): the document is cut into overlapping ~6,000-character slices, read in parallel with a prompt that only lists specific, testable rules, including table cells and change logs. A rule is kept only if its quote is really in the document. A merge pass then combines duplicates by situation, keeping every specific (names, times, ages, thresholds, refusals).
2. **Copy, don’t paraphrase:** the server writes the rule list into the persona word for word, as one “Add the client’s N rules” card that is reviewed first. The persona is in front of the agent at every step.
3. **Design:** the model builds only the graph, giving a step and arrows to every rule that changes where the call goes: emergencies, crisis lines, a baby with a fever, callers who may not book, handoffs.

On the same document this catches 12 of 12 (`docs/samples/lakeside-guidelines-answer-key.md`). The coverage list shows every extracted rule, its quote, and where it lives.

## Trade-offs

- The persona gets long (about 8,000 characters for 50 rules). That is a few thousand tokens on each turn, which costs latency and money. It is the price of not losing a rule.
- Extraction is a model too: it can miss a rule, and the merge can blur one. The coverage list is there so a person can check the list against the document in a minute, instead of re-reading 11 pages.
- A draft from a long document takes about a minute.
- If the model keeps pointing an arrow at a step that does not exist, the last attempt drops those ops and says so, instead of failing the whole draft.
