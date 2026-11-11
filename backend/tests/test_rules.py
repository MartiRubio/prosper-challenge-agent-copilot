"""application.copilot.extract_rules: slicing a document and copying rules into the persona."""

from application.copilot.extract_rules import _OVERLAP, _slices, rules_into_persona


def test_slices_cover_the_whole_document_with_overlap():
    text = "\n".join(f"Paragraph {i}: " + "word " * 40 for i in range(200))
    parts = _slices(text)
    assert len(parts) > 1
    assert parts[0].startswith("Paragraph 0") and text.endswith(parts[-1])
    for left, right in zip(parts, parts[1:]):
        # Each slice starts inside the end of the one before, so no rule is cut in half unseen.
        assert right[:50] in left[-(_OVERLAP + 50):]


def test_a_short_document_is_one_slice():
    assert _slices("Short.") == ["Short."]


def test_rules_go_into_the_persona_verbatim_as_the_first_change(agent):
    agent["persona"] = "You are friendly.\n\nClinic rules:\n1. An old rule."
    rules = [{"rule": "Never book Saturdays.", "quote": "No Saturday appointments", "source": "g.pdf"},
             {"rule": "Say we participate, never covered.", "quote": "we participate", "source": "g.pdf"}]
    changes = [{"id": "c1", "title": "Graph", "detail": "", "evidence": [],
                "ops": [{"op": "set_persona", "content": "You are warm."},
                        {"op": "add_node", "name": "x", "content": "x"}]}]
    result = rules_into_persona(agent, changes, rules)
    assert result[0]["id"] == "rules"
    persona = result[0]["ops"][0]["content"]
    assert persona == "You are warm.\n\nClinic rules:\n1. Never book Saturdays.\n2. Say we participate, never covered."
    assert result[1]["ops"] == [{"op": "add_node", "name": "x", "content": "x"}]
