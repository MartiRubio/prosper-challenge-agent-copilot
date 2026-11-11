"""domain.agent_rules and domain.function_rules: names, tools and the catalog."""

import pytest

from domain.agent_rules import clean_properties, edge_tool, is_plain_function, op_rank, with_destination
from domain.function_rules import validate_catalog


def test_the_arrow_description_wins_over_the_catalog(catalog):
    by_name = {item["name"]: item for item in catalog}
    tool = edge_tool({"function": "choose_intent", "description": "Only when they want to cancel.", "target": "cancel"}, by_name)
    assert tool["description"] == "Only when they want to cancel. Continue to cancel."
    assert tool["properties"] == by_name["choose_intent"]["properties"]
    assert tool["required"] == ["intent"]


def test_an_arrow_without_a_description_uses_the_catalog_one(catalog):
    by_name = {item["name"]: item for item in catalog}
    tool = edge_tool({"function": "record_details", "description": "", "target": "confirm"}, by_name)
    assert tool["description"] == "Record name and reason. Continue to confirm."


def test_the_destination_is_added_once():
    assert with_destination("Go on. Continue to x.", "x") == "Go on. Continue to x."
    assert with_destination("", "x") == "Continue to x."


@pytest.mark.parametrize("name, plain", [
    ("no_function", True), ("no_function_3", True), ("continue", True), ("continue-2", True),
    ("go_cancel", False), ("choose_intent", False), (None, False),
])
def test_plain_functions(name, plain):
    assert is_plain_function(name) is plain


def test_functions_and_steps_come_before_the_arrows_that_name_them():
    assert op_rank({"op": "add_function"}) < op_rank({"op": "add_node"}) < op_rank({"op": "add_edge"})
    assert op_rank({"op": "mystery"}) > op_rank({"op": "remove_node"})


def test_clean_properties_keeps_string_type_and_valid_choices():
    cleaned = clean_properties({"visit": {"type": "integer", "description": "Kind", "enum": ["a", "b"]},
                                "note": {"enum": ["", "x"]}})
    assert cleaned == {"visit": {"type": "string", "description": "Kind", "enum": ["a", "b"]},
                       "note": {"type": "string", "description": ""}}
    with pytest.raises(ValueError, match="Invalid field"):
        clean_properties({"bad field": {}})


def test_the_catalog_rejects_duplicates_and_trims_required():
    with pytest.raises(ValueError, match="listed twice"):
        validate_catalog([{"name": "a"}, {"name": "a"}])
    clean = validate_catalog([{"name": "a", "properties": {"x": {}}, "required": ["x", "y"]}])
    assert clean[0]["required"] == ["x"]
