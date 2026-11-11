"""Other model-backed use cases with a fake model: the call check, simulated calls, test data."""

import json

import application.copilot.check_call as check
import application.copilot.generate_test_data as test_data
import application.copilot.simulate_call as simulate
from infrastructure.agent_files import write_document
from tests.fake_model import FakeChat, FakeJson, calls_tool, says


def recorded_call(data_dir, agent, **extra):
    write_document("clinic", agent)
    call = {"id": "call-1", "agent_id": "clinic", "title": "Test", "started_at": "2026-11-11T10:00:00Z",
            "turns": [{"role": "agent", "text": "Your visit is confirmed."}, {"role": "caller", "text": "Thanks."}], **extra}
    (data_dir / "clinic" / "calls").mkdir()
    (data_dir / "clinic" / "calls" / "call-1.json").write_text(json.dumps(call))


def test_the_check_is_stored_and_cleaned(monkeypatch, data_dir, agent):
    recorded_call(data_dir, agent)
    model = FakeJson({"status": "issue", "severity": "extreme", "issue": " Booked without asking. ", "step": "collect",
                      "quote": "Your visit is confirmed.", "feedback": "Ask first."})
    monkeypatch.setattr(check, "complete_json", model)
    result = check.check_call("clinic", "call-1")
    assert result["status"] == "issue" and result["severity"] == "low" and result["issue"] == "Booked without asking."
    assert json.loads((data_dir / "clinic" / "checks.json").read_text())["call-1"]["issue"] == "Booked without asking."
    assert model.calls[0]["prompt"] == "call_check" and model.calls[0]["temperature"] == 0


def test_an_ok_check_carries_no_issue_text(monkeypatch, data_dir, agent):
    recorded_call(data_dir, agent)
    monkeypatch.setattr(check, "complete_json", FakeJson({"status": "fine?", "issue": "leftover"}))
    result = check.check_call("clinic", "call-1")
    assert result["status"] == "ok" and result["issue"] == ""


def test_a_test_call_from_a_later_step_tells_the_check_where_it_started(monkeypatch, data_dir, agent):
    recorded_call(data_dir, agent, source="test", start_node="confirm", test_data={"name": "Ana"})
    model = FakeJson({"status": "ok"})
    monkeypatch.setattr(check, "complete_json", model)
    check.check_call("clinic", "call-1")
    sent = model.calls[0]["user"]
    assert sent["started_at_step"] == "confirm" and sent["test_data_given_to_agent"] == {"name": "Ana"}


def test_a_simulated_call_moves_along_the_arrows_like_a_live_call(monkeypatch, agent, catalog):
    chat = FakeChat(
        agent_replies=[says("Hi, how can I help?"), calls_tool("choose_intent"), says("Your name, please?"),
                       calls_tool("record_details"), says("You're booked. Goodbye!")],
        caller_replies=["I'd like to book.", "Ana Ruiz."],
    )
    monkeypatch.setattr(simulate, "complete_chat", chat)
    by_name = {item["name"]: item for item in catalog}
    result = simulate.simulate_call({**agent, "model": "agent-model"}, by_name, {"goal": "Book a visit"})
    assert result["path"] == ["greeting", "collect", "confirm"]
    assert result["ended"] == "agent"
    assert [t["text"] for t in result["transcript"] if t["role"] == "caller"] == ["I'd like to book.", "Ana Ruiz."]
    first = chat.agent_calls[0]
    assert first["model"] == "agent-model"
    assert first["messages"][0] == {"role": "system", "content": "You are a scheduling assistant."}
    assert [tool["function"]["name"] for tool in first["tools"]] == ["choose_intent"]
    assert first["tools"][0]["function"]["description"].endswith("Continue to collect.")


def test_a_caller_hanging_up_ends_the_simulated_call(monkeypatch, agent, catalog):
    chat = FakeChat(agent_replies=[says("Hi, how can I help?")], caller_replies=["Wrong number, sorry. [HANG UP]"])
    monkeypatch.setattr(simulate, "complete_chat", chat)
    result = simulate.simulate_call(agent, {}, {"goal": "None"})
    assert result["ended"] == "caller"
    assert result["transcript"][-1]["text"] == "Wrong number, sorry."


def test_test_data_outside_a_fields_choices_is_dropped(monkeypatch, agent):
    monkeypatch.setattr(test_data, "complete_json", FakeJson({"values": {"intent": "reschedule", "name": " Ana "}}))
    values = test_data.generate_test_data({"agent": agent, "fields": [
        {"name": "intent", "options": ["book", "cancel"]}, {"name": "name"}]})
    assert values == {"values": {"name": "Ana"}}
