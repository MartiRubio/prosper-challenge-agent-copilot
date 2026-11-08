import { MarkerType, type Edge, type Node } from "@xyflow/react";

import type { AgentDocument } from "../editor/agentDocument";
import { defaultLayout } from "./defaultLayout";

export function toFlowGraph(document: AgentDocument): { nodes: Node[]; edges: Edge[] } {
    const positions = defaultLayout(document);
    const nodes: Node[] = document.nodes.map((node) => ({
        id: node.name,
        position: positions[node.name],
        data: {
            label: nodeLabel(node.name, node.name === document.initial_node, Boolean(node.end)),
        },
    }));
    const edges: Edge[] = [];
    for (const node of document.nodes) {
        for (const edge of node.edges ?? []) {
            edges.push({
                id: `${node.name}:${edge.function}`,
                source: node.name,
                target: edge.target,
                label: edge.function,
                markerEnd: { type: MarkerType.ArrowClosed },
            });
        }
    }
    return { nodes, edges };
}

function nodeLabel(name: string, initial: boolean, end: boolean): string {
    if (initial) {
        return `${name} · start`;
    }
    if (end) {
        return `${name} · end`;
    }
    return name;
}
