"""application.copilot.change_shape: checks on a proposal before anyone reviews it."""

import pytest

from application.copilot.change_shape import check_changes, drop_dangling, prepare_ops


def change(ops: list, change_id: str = "c1") -> dict:
    return {"id": change_id, "title": change_id, "detail": "", "evidence": [], "ops": ops}


def test_a_clean_change_has_no_warnings(agent, catalog):
    ops = [{"op": "add_node", "name": "cancel", "content": "Cancel.", "end": True},
           {"op": "add_edge", "source": "greeting", "function": "no_function", "target": "cancel"}]
    assert check_changes(agent, catalog, [change(ops)]) == []


def test_an_arrow_to_a_step_nobody_creates_is_an_error(agent, catalog):
    ops = [{"op": "add_edge", "source": "greeting", "function": "no_function", "target": "choose_intent"}]
    with pytest.raises(ValueError, match="never created with add_node: choose_intent"):
        check_changes(agent, catalog, [change(ops)])


def test_unreachable_steps_and_dead_ends_are_warnings(agent, catalog):
    ops = [{"op": "add_node", "name": "orphan", "content": "Nobody gets here."}]
    warnings = check_changes(agent, catalog, [change(ops)])
    assert any("No arrow leads to these steps from Start: orphan" in w for w in warnings)
    assert any("no way out" in w and "orphan" in w for w in warnings)


def test_a_change_too_big_to_review_is_a_warning(agent, catalog):
    ops = [{"op": "add_node", "name": f"s{i}", "content": "x", "end": True} for i in range(5)]
    ops += [{"op": "add_edge", "source": "greeting", "function": "no_function", "target": f"s{i}"} for i in range(5)]
    warnings = check_changes(agent, catalog, [change(ops)])
    assert any("more than 8 ops" in w for w in warnings)


def test_dangling_ops_are_dropped_on_the_last_attempt_with_a_warning(agent):
    good = {"op": "set_task", "node": "greeting", "content": "Hello."}
    bad = {"op": "add_edge", "source": "greeting", "function": "no_function", "target": "ghost"}
    kept, warnings = drop_dangling(agent, [change([good, bad]), change([bad], "c2")])
    assert [c["id"] for c in kept] == ["c1"]
    assert kept[0]["ops"] == [good]
    assert "ghost" in warnings[0]


def test_reusing_a_function_on_one_step_becomes_its_own_go_function(agent):
    ops = [{"op": "add_edge", "source": "greeting", "function": "choose_intent", "target": "confirm",
            "description": "When they want to confirm."}]
    prepared = prepare_ops(agent, [change(ops)])[0]["ops"]
    assert prepared[0] == {"op": "add_function", "name": "go_confirm", "description": "When they want to confirm.",
                           "properties": {}, "required": []}
    assert prepared[1]["function"] == "go_confirm"
