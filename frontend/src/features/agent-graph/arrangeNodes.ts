import { Graph, layout } from "@dagrejs/dagre";

import type { AgentDocument, NodePosition } from "../editor/agentDocument";
import { labelWidth } from "./labelPlacement";
import { END_ID, START_ID } from "./markers";

const STEP_SIZE = { width: 180, height: 52 };
const MARKER_SIZE = { width: 120, height: 40 };

export function arrangeNodes(
    document: AgentDocument,
    sizes: Record<string, { width: number; height: number }> = {},
): Record<string, NodePosition> {
    const graph = new Graph({ multigraph: true });
    graph.setDefaultEdgeLabel(() => ({}));
    // Arrows carry labels, so the layout reserves room for each one: labelled
    // arrows out of one step get pushed apart, and ranks get space for the labels.
    graph.setGraph({ rankdir: "TB", nodesep: 48, edgesep: 24, ranksep: 64, marginx: 24, marginy: 24 });
    for (const id of nodeIds(document)) {
        const measured = sizes[id];
        const fallback = id === START_ID || id === END_ID ? MARKER_SIZE : STEP_SIZE;
        graph.setNode(id, {
            width: measured?.width || fallback.width,
            height: measured?.height || fallback.height,
        });
    }
    let edgeIndex = 0;
    const link = (source: string, target: string, functionName?: string) => {
        if (!graph.hasNode(source) || !graph.hasNode(target) || source === target) {
            return;
        }
        graph.setEdge(source, target, { width: labelWidth(functionName), height: 30, labelpos: "c" }, `e${edgeIndex}`);
        edgeIndex += 1;
    };
    if (document.nodes.some((node) => node.name === document.initial_node)) {
        link(START_ID, document.initial_node);
    }
    for (const node of document.nodes) {
        for (const edge of node.edges ?? []) {
            link(node.name, edge.target, edge.function);
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
