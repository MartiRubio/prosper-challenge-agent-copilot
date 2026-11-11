#
# AgentBuilder — loads a declarative agent (JSON / dict) and compiles its node
# graph into Pipecat Flows objects.
#
#   JSON  ->  AgentConfig (validated)  ->  Pipecat Flows NodeConfig graph
#
# This is the seam between "agent as data" (what the Phase 2 Composer produces)
# and "agent as a running conversation" (what bot.py executes). Keeping the
# compile + validation here means bot.py never touches the graph internals.
#

import json
from collections.abc import Callable
from pathlib import Path
from typing import Union

from loguru import logger
from pipecat_flows import FlowManager, FlowsFunctionSchema, NodeConfig

from domain.agent_rules import edge_tool

from .function_catalog import catalog_by_name
from .schema import AgentConfig, Edge, Node


class AgentBuilder:
    """Builds a runnable Pipecat Flows graph from a declarative AgentConfig."""

    def __init__(self, config: AgentConfig, on_transition: Callable[[str], None] | None = None):
        self.config = config
        self._on_transition = on_transition
        self._nodes_by_name = {n.name: n for n in config.nodes}
        self._functions = catalog_by_name()
        self._validate()

    # ---- loading -----------------------------------------------------------
    @classmethod
    def from_dict(cls, data: dict, on_transition: Callable[[str], None] | None = None) -> "AgentBuilder":
        return cls(AgentConfig.from_dict(data), on_transition=on_transition)

    @classmethod
    def from_json(cls, path: Union[str, Path], on_transition: Callable[[str], None] | None = None) -> "AgentBuilder":
        data = json.loads(Path(path).read_text())
        return cls.from_dict(data, on_transition=on_transition)

    # ---- validation --------------------------------------------------------
    def _validate(self) -> None:
        names = set(self._nodes_by_name)
        if not names:
            raise ValueError("Agent has no nodes.")
        if self.config.initial_node not in names:
            raise ValueError(
                f"initial_node '{self.config.initial_node}' is not a defined node."
            )
        for node in self.config.nodes:
            for edge in node.edges:
                if edge.target not in names:
                    raise ValueError(
                        f"Edge '{edge.function}' in node '{node.name}' targets "
                        f"unknown node '{edge.target}'."
                    )

    # ---- compilation -------------------------------------------------------
    def build_initial_node(self) -> NodeConfig:
        """Return the entry NodeConfig; downstream nodes are built lazily on transition."""
        return self._make_node(self._nodes_by_name[self.config.initial_node])

    def node_config(self, name: str) -> NodeConfig | None:
        """Return one node's compiled config, for a jump during a test call."""
        node = self._nodes_by_name.get(name)
        if node is None:
            return None
        return self._make_node(node)

    def _make_node(self, node: Node) -> NodeConfig:
        node_config: NodeConfig = {
            "name": node.name,
            "role_message": node.role_message or self.config.persona,
            "task_messages": node.task_messages,
            "functions": [self._make_edge_function(edge) for edge in node.edges],
        }
        if node.pre_actions:
            node_config["pre_actions"] = node.pre_actions
        # Explicit post_actions win; otherwise a terminal node ends the call.
        if node.post_actions:
            node_config["post_actions"] = node.post_actions
        elif node.end:
            node_config["post_actions"] = [{"type": "end_conversation"}]
        return node_config

    def _make_edge_function(self, edge: Edge) -> FlowsFunctionSchema:
        async def handler(args: dict, flow_manager: FlowManager):
            # Persist what the caller gave us so later nodes can use it.
            flow_manager.state.update(args)
            logger.info(f"[{edge.function}] -> {edge.target} | collected: {args}")
            if self._on_transition is not None:
                self._on_transition(edge.target)
            next_node = self._make_node(self._nodes_by_name[edge.target])
            return {"status": "success", **args}, next_node

        tool = edge_tool(
            {
                "function": edge.function,
                "description": edge.description,
                "target": edge.target,
                "properties": edge.properties,
                "required": edge.required,
            },
            self._functions,
        )
        return FlowsFunctionSchema(
            name=tool["name"],
            description=tool["description"],
            properties=tool["properties"],
            required=tool["required"],
            handler=handler,
        )
