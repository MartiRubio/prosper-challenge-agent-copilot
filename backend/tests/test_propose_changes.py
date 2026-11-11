"""application.copilot.propose_changes with a fake model: the retry loop and what each attempt is sent."""

import pytest

import application.copilot.propose_changes as propose
from tests.fake_model import FakeJson

CANCEL_STEP = {"op": "add_node", "name": "cancel", "content": "Cancel the appointment.", "end": True}
TO_CANCEL = {"op": "add_edge", "source": "greeting", "function": "no_function", "target": "cancel",
             "description": "When they want to cancel."}
DANGLING = {"op": "add_edge", "source": "greeting", "function": "no_function", "target": "choose_intent"}


def answer(*ops, quote="I need to cancel Thursday"):
    return {"summary": "Add a cancel path.", "changes": [{
        "id": "c1", "title": "Cancel path", "detail": "",
        "evidence": [{"source": "call", "ref": "call-1", "quote": quote}], "ops": list(ops)}]}


def body(agent, catalog, **extra):
    calls = [{"id": "call-1", "agent_id": "clinic", "title": "Cancel", "feedback": "Wanted to cancel",
              "turns": [{"role": "caller", "text": "I need to cancel Thursday."}]}]
    return {"agent": agent, "agent_id": "clinic", "catalog": catalog, "message": "Fix the flagged call.",
            "calls": calls, **extra}


def test_a_valid_answer_is_returned_on_the_first_attempt(monkeypatch, agent, catalog):
    model = FakeJson(answer(CANCEL_STEP, TO_CANCEL))
    monkeypatch.setattr(propose, "complete_json", model)
    result = propose.propose_changes(body(agent, catalog))
    assert len(model.calls) == 1
    assert model.calls[0]["prompt"] == "flow_edit"
    sent = model.calls[0]["user"]
    assert sent["message"] == "Fix the flagged call."
    assert sent["calls"][0]["feedback"] == "Wanted to cancel"
    assert {s["name"] for s in sent["agent"]["nodes"]} == {"greeting", "collect", "confirm"}
    assert sent["catalog"][0]["name"] == "choose_intent"
    assert result["warnings"] == []
    assert result["changes"][0]["evidence"][0]["verified"] is True


def test_a_rejected_answer_is_retried_as_a_conversation(monkeypatch, agent, catalog):
    model = FakeJson(answer(DANGLING), answer(CANCEL_STEP, TO_CANCEL))
    monkeypatch.setattr(propose, "complete_json", model)
    result = propose.propose_changes(body(agent, catalog))
    assert len(model.calls) == 2
    retry = model.calls[1]["turns"]
    assert [turn["role"] for turn in retry] == ["assistant", "user"]
    assert "choose_intent" in retry[0]["content"]
    assert "never created with add_node: choose_intent" in retry[1]["content"]
    assert [op["op"] for op in result["changes"][0]["ops"]] == ["add_node", "add_edge"]


def test_the_last_attempt_drops_dangling_ops_instead_of_failing(monkeypatch, agent, catalog):
    model = FakeJson(answer(CANCEL_STEP, TO_CANCEL, DANGLING))
    monkeypatch.setattr(propose, "complete_json", model)
    result = propose.propose_changes(body(agent, catalog))
    assert len(model.calls) == 3
    assert DANGLING not in result["changes"][0]["ops"]
    assert any("choose_intent" in w for w in result["warnings"])


def test_shape_warnings_are_retried_then_reported(monkeypatch, agent, catalog):
    orphan = {"op": "add_node", "name": "orphan", "content": "Nobody gets here.", "end": True}
    model = FakeJson(answer(orphan))
    monkeypatch.setattr(propose, "complete_json", model)
    result = propose.propose_changes(body(agent, catalog))
    assert len(model.calls) == 3
    assert any("orphan" in w for w in result["warnings"])


def test_an_invented_quote_is_marked_not_found(monkeypatch, agent, catalog):
    monkeypatch.setattr(propose, "complete_json", FakeJson(answer(CANCEL_STEP, TO_CANCEL, quote="Please cancel all my visits")))
    result = propose.propose_changes(body(agent, catalog))
    assert result["changes"][0]["evidence"][0]["verified"] is False


def test_calls_for_another_agent_are_not_sent(monkeypatch, agent, catalog):
    model = FakeJson(answer(CANCEL_STEP, TO_CANCEL))
    monkeypatch.setattr(propose, "complete_json", model)
    propose.propose_changes({**body(agent, catalog), "agent_id": "other-agent"})
    assert model.calls[0]["user"]["calls"] == []


def test_with_guidelines_the_rules_lead_and_a_retry_leaves_out_the_document(monkeypatch, agent, catalog):
    rules = [{"id": "r1", "rule": "Never book Saturdays.", "quote": "No Saturday appointments", "source": "g.txt"}]
    monkeypatch.setattr(propose, "extract_rules", lambda attachments: rules)
    model = FakeJson(answer(DANGLING), answer(CANCEL_STEP, TO_CANCEL))
    monkeypatch.setattr(propose, "complete_json", model)
    document = "Our policy. No Saturday appointments. " * 50
    result = propose.propose_changes(body(agent, catalog, attachments=[{"name": "g.txt", "text": document}]))
    assert model.calls[0]["user"]["attachments"][0]["text"] == document.strip()
    assert "Left out of this retry" in model.calls[1]["user"]["attachments"][0]["text"]
    assert result["changes"][0]["id"] == "rules"
    assert "1. Never book Saturdays." in result["changes"][0]["ops"][0]["content"]
    assert result["coverage"] == [{"rule": "Never book Saturdays.", "quote": "No Saturday appointments", "covered_by": "persona"}]


@pytest.mark.parametrize("bad", [{"agent": None, "message": "x"}, {"agent": {"nodes": []}, "message": " "}])
def test_bad_requests_fail_before_any_model_call(monkeypatch, bad):
    model = FakeJson(answer())
    monkeypatch.setattr(propose, "complete_json", model)
    with pytest.raises(ValueError):
        propose.propose_changes(bad)
    assert model.calls == []
