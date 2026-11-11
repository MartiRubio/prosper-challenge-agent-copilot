import { Graph, layout } from "@dagrejs/dagre";

import type { AgentDocument, NodePosition } from "../editor/agentDocument";
import { END_ID, START_ID } from "./markers";

const STEP_SIZE = { width: 180, height: 52 };
const MARKER_SIZE = { width: 120, height: 40 };

export function arrangeNodes(
    document: AgentDocument,
    sizes: Record<string, { width: number; height: number }> = {},
): Record<string, NodePosition> {
    const graph = new Graph({ multigraph: true });
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: "TB", nodesep: 90, ranksep: 56, marginx: 24, marginy: 24 });
    for (const id of nodeIds(document)) {
        const measured = sizes[id];
        const fallback = id === START_ID || id === END_ID ? MARKER_SIZE : STEP_SIZE;
        graph.setNode(id, {
            width: measured?.width || fallback.width,
            height: measured?.height || fallback.height,
        });
    }
    let edgeIndex = 0;
    const link = (source: string, target: string) => {
        if (!graph.hasNode(source) || !graph.hasNode(target) || source === target) {
            return;
        }
        graph.setEdge(source, target, {}, `e${edgeIndex}`);
        edgeIndex += 1;
    };
    if (document.nodes.some((node) => node.name === document.initial_node)) {
        link(START_ID, document.initial_node);
    }
    for (const node of document.nodes) {
        for (const edge of node.edges ?? []) {
            link(node.name, edge.target);
        }
        if (node.end) {
            link(node.name, END_ID);
        }
    }
    layout(graph);
    const positions: Record<string, NodePosition> = {};
    for (const id of nodeIds(document)) {
        const placed = graph.node(id);
        positions[id] = {
            x: placed.x - placed.width / 2,
            y: placed.y - placed.height / 2,
        };
    }
    return positions;
}

export function nodeIds(document: AgentDocument): string[] {
    return [START_ID, ...document.nodes.map((node) => node.name), END_ID];
}
