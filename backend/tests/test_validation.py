"""domain.validation: what every saved or patched agent must satisfy."""

import pytest

from domain.validation import validate_agent

CATALOG = {"choose_intent", "record_details"}


def test_a_well_formed_agent_passes(agent):
    validate_agent(agent, CATALOG)


def test_plain_continues_need_no_catalog_entry(agent):
    agent["nodes"][2]["edges"] = [{"function": "no_function_2", "target": "greeting"}]
    validate_agent(agent, CATALOG)


@pytest.mark.parametrize("change, message", [
    (lambda a: a.update(nodes=[]), "no steps"),
    (lambda a: a.update(initial_node="ghost"), "Start must point at a step"),
    (lambda a: a["nodes"][1].update(task_messages=[{"role": "developer", "content": "  "}]), "needs a spoken task"),
    (lambda a: a["nodes"][0]["edges"][0].update(target="ghost"), "targets unknown step 'ghost'"),
    (lambda a: a["nodes"][0]["edges"][0].update(function="not_in_catalog"), "not in the catalog"),
    (lambda a: a["nodes"].append(dict(a["nodes"][0])), "unique"),
    (lambda a: a["nodes"][0]["edges"].append(dict(a["nodes"][0]["edges"][0])), "uses a function twice"),
])
def test_broken_agents_are_rejected(agent, change, message):
    change(agent)
    with pytest.raises(ValueError, match=message):
        validate_agent(agent, CATALOG)
