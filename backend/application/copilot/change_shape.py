"""Checks on a proposal before anyone reviews it.

A proposal must apply cleanly, leave every step reachable from Start with a way
to end, and keep each change small enough to review as one Keep or Discard.
"""

from application.copilot.apply_changes import apply_changes
from domain.agent_rules import is_plain_function, is_valid_name, op_rank

# Each change is one card the team keeps or discards. Eight ops is about one new
# step with its arrows and a function or two; past that a card is hard to review.
_OPS_PER_CHANGE = 8


def prepare_ops(document: dict, changes: list[dict]) -> list[dict]:
    used = {
        node.get("name"): {edge.get("function") for edge in (node.get("edges") or [])}
        for node in document.get("nodes") or []
        if isinstance(node, dict)
    }
    for change in changes:
        prepared = []
        for op in sorted(change["ops"], key=op_rank):
            if op.get("op") == "add_node" and isinstance(op.get("name"), str):
                used.setdefault(op["name"], set())
            if op.get("op") == "add_edge":
                op, added = _fresh_function(used, op)
                if added:
                    prepared.append(added)
            if op.get("op") == "remove_edge":
                names = used.get(op.get("source"))
                if names is not None:
                    names.discard(op.get("function"))
            prepared.append(op)
        change["ops"] = prepared
    return changes


def _fresh_function(used: dict, op: dict) -> tuple[dict, dict | None]:
    """A step cannot use one function twice; a repeat becomes its own go_<target> function."""
    source = op.get("source")
    function = op.get("function")
    names = used.setdefault(source, set())
    if not isinstance(function, str) or function not in names or is_plain_function(function):
        if isinstance(function, str):
            names.add(function)
        return op, None
    target = op.get("target") if isinstance(op.get("target"), str) else "next"
    base = f"go_{target}" if is_valid_name(f"go_{target}") else "go_next"
    name = base
    index = 2
    while name in names:
        name = f"{base}_{index}"
        index += 1
    names.add(name)
    description = op.get("description") if isinstance(op.get("description"), str) else f"Continue to {target}."
    added = {
        "op": "add_function",
        "name": name,
        "description": description,
        "properties": {},
        "required": [],
    }
    return {**op, "function": name}, added


def check_changes(document: dict, catalog: list, changes: list[dict]) -> list[str]:
    """Raise for a proposal that cannot apply; return shape problems worth a retry."""
    ops = [op for change in changes for op in change["ops"]]
    missing = _missing_steps(document, ops)
    if missing:
        names = ", ".join(sorted(missing))
        raise ValueError(
            f"These steps are named by ops but never created with add_node: {names}. "
            "Add an add_node for each one in the change that uses it, or drop the ops that name it."
        )
    if not ops:
        return []
    agent, _ = apply_changes(document, ops, catalog)
    problems = _shape_problems(agent)
    large = [change["id"] for change in changes if len(change["ops"]) > _OPS_PER_CHANGE]
    if large:
        problems.append(
            f"Changes {', '.join(large)} have more than {_OPS_PER_CHANGE} ops. "
            "Split each into one change per path or rule so a reviewer can keep them one at a time."
        )
    return problems


def _shape_problems(agent: dict) -> list[str]:
    """A proposal must leave every step reachable from Start and every path able to end."""
    nodes = {node["name"]: node for node in agent.get("nodes") or []}
    reachable: set[str] = set()
    frontier = [agent.get("initial_node")]
    while frontier:
        name = frontier.pop()
        if name in reachable or name not in nodes:
            continue
        reachable.add(name)
        frontier.extend(edge.get("target") for edge in nodes[name].get("edges") or [])
    problems = []
    unreachable = sorted(set(nodes) - reachable)
    if unreachable:
        problems.append(f"No arrow leads to these steps from Start: {', '.join(unreachable)}. Connect them or remove them.")
    dead_ends = sorted(
        name for name, node in nodes.items()
        if not node.get("end") and not node.get("edges")
    )
    if dead_ends:
        problems.append(
            f"These steps have no way out and do not end the call: {', '.join(dead_ends)}. "
            "Add arrows whose source is that step, or set end. Check that arrows meant to leave it do not name an earlier step as source."
        )
    return problems


def drop_dangling(document: dict, changes: list[dict]) -> tuple[list[dict], list[str]]:
    """Last resort: drop ops that name steps nobody creates, and say which, instead of failing."""
    ops = [op for change in changes for op in change["ops"]]
    missing = _missing_steps(document, ops)
    if not missing:
        return changes, []
    kept = []
    for change in changes:
        remaining = [op for op in change["ops"] if not (_named(op) & missing)]
        if remaining:
            kept.append({**change, "ops": remaining})
    names = ", ".join(sorted(missing))
    return kept, [f"Dropped the parts of this proposal that pointed at steps nobody creates ({names}). Check the arrows before keeping."]


def _named(op: dict) -> set[str]:
    kind = op.get("op")
    names: set[str] = set()
    if kind in {"add_edge", "set_edge", "remove_edge"}:
        names.add(op.get("source"))
    if kind in {"add_edge", "set_edge"} and op.get("target") is not None:
        names.add(op.get("target"))
    if kind in {"set_task", "set_initial", "set_end", "remove_node"}:
        names.add(op.get("node"))
    return {name for name in names if isinstance(name, str)}


def _missing_steps(document: dict, ops: list[dict]) -> set[str]:
    """Every step an op points at that neither exists nor is added by some op."""
    known = {node.get("name") for node in document.get("nodes") or [] if isinstance(node, dict)}
    known |= {op.get("name") for op in ops if op.get("op") == "add_node"}
    named: set[str] = set()
    for op in ops:
        named |= _named(op)
    return {name for name in named if name not in known}
