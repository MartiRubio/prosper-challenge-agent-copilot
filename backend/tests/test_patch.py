"""domain.patch: how copilot ops change an agent."""

import pytest

from domain.patch import apply_ops


def names(agent: dict) -> list[str]:
    return [node["name"] for node in agent["nodes"]]


def test_ops_apply_in_dependency_order_whatever_order_they_arrive(agent, catalog):
    ops = [
        {"op": "add_edge", "source": "greeting", "function": "no_function", "target": "cancel"},
        {"op": "add_node", "name": "cancel", "content": "Cancel it.", "end": True},
    ]
    result, _ = apply_ops(agent, ops, catalog)
    assert "cancel" in names(result)
    assert result["nodes"][0]["edges"][-1]["target"] == "cancel"


def test_the_input_document_is_not_changed(agent, catalog):
    before = names(agent)
    apply_ops(agent, [{"op": "remove_node", "node": "collect"}], catalog)
    assert names(agent) == before


def test_removing_a_step_removes_the_arrows_into_it_and_moves_start(agent, catalog):
    result, _ = apply_ops(agent, [{"op": "remove_node", "node": "greeting"}], catalog)
    assert result["initial_node"] == "collect"
    result, _ = apply_ops(agent, [{"op": "remove_node", "node": "collect"}], catalog)
    assert all(edge["target"] != "collect" for node in result["nodes"] for edge in node["edges"])


def test_a_first_step_on_an_empty_agent_becomes_start(catalog):
    empty = {"name": "New", "initial_node": "", "nodes": []}
    result, _ = apply_ops(empty, [{"op": "add_node", "name": "hello", "content": "Say hi."}], catalog)
    assert result["initial_node"] == "hello"


def test_a_catalog_function_keeps_its_fields_in_the_catalog(agent, catalog):
    ops = [{"op": "add_edge", "source": "confirm", "function": "choose_intent", "target": "greeting",
            "properties": {"x": {"type": "string"}}}]
    result, _ = apply_ops(agent, ops, catalog)
    edge = result["nodes"][2]["edges"][0]
    assert edge["properties"] == {} and edge["required"] == []
    assert edge["description"] == "Record what the caller wants."


def test_a_second_plain_arrow_from_one_step_gets_a_suffix(agent, catalog):
    ops = [
        {"op": "add_edge", "source": "confirm", "function": "no_function", "target": "greeting"},
        {"op": "add_edge", "source": "confirm", "function": "no_function", "target": "collect"},
    ]
    result, _ = apply_ops(agent, ops, catalog)
    assert [edge["function"] for edge in result["nodes"][2]["edges"]] == ["no_function", "no_function_2"]


def test_a_named_function_cannot_be_used_twice_on_one_step(agent, catalog):
    with pytest.raises(ValueError, match="already uses 'choose_intent'"):
        apply_ops(agent, [{"op": "add_edge", "source": "greeting", "function": "choose_intent", "target": "confirm"}], catalog)


def test_editing_a_missing_arrow_names_the_arrows_that_exist(agent, catalog):
    with pytest.raises(ValueError, match="Its arrows are: choose_intent"):
        apply_ops(agent, [{"op": "set_edge", "source": "greeting", "function": "record_caller_info", "target": "confirm"}], catalog)


@pytest.mark.parametrize("op, message", [
    ({"op": "add_node", "name": "bad name!"}, "Invalid step name"),
    ({"op": "add_node", "name": "greeting"}, "already exists"),
    ({"op": "set_task", "node": "nowhere", "content": "x"}, "Unknown step 'nowhere'"),
    ({"op": "add_edge", "source": "greeting", "function": "go", "target": "nowhere"}, "Unknown step 'nowhere'"),
    ({"op": "explode"}, "Unknown op 'explode'"),
])
def test_bad_ops_are_rejected_with_a_reason(agent, catalog, op, message):
    with pytest.raises(ValueError, match=message):
        apply_ops(agent, [op], catalog)


def test_add_function_cleans_fields_and_drops_unknown_required(agent, catalog):
    op = {"op": "add_function", "name": "take_card", "description": " Card. ",
          "properties": {"last4": {"type": "number", "description": "Last digits"}}, "required": ["last4", "ghost"]}
    _, functions = apply_ops(agent, [op], catalog)
    added = functions[-1]
    assert added == {"name": "take_card", "description": "Card.",
                     "properties": {"last4": {"type": "string", "description": "Last digits"}}, "required": ["last4"]}
