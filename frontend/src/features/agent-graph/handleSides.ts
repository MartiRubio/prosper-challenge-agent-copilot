import { Position } from "@xyflow/react";

import type { AgentDocument, NodePosition } from "../editor/agentDocument";
import { END_ID, START_ID } from "./markers";

export function handleSides(
    document: AgentDocument,
    positions: Record<string, NodePosition>,
): Record<string, { source: Position; target: Position }> {
    const nextOf = new Map<string, string>();
    const prevOf = new Map<string, string>();
    if (document.nodes.some((node) => node.name === document.initial_node)) {
        nextOf.set(START_ID, document.initial_node);
        prevOf.set(document.initial_node, START_ID);
    }
    for (const node of document.nodes) {
        const edge = node.edges?.[0];
        if (edge) {
            nextOf.set(node.name, edge.target);
            if (!prevOf.has(edge.target)) {
                prevOf.set(edge.target, node.name);
            }
        } else if (node.end) {
            nextOf.set(node.name, END_ID);
        }
        if (node.end && !prevOf.has(END_ID)) {
            prevOf.set(END_ID, node.name);
        }
    }
    const sides: Record<string, { source: Position; target: Position }> = {};
    for (const id of Object.keys(positions)) {
        const here = positions[id];
        const next = nextOf.get(id);
        const prev = prevOf.get(id);
        sides[id] = {
            source: next && positions[next] ? facing(here, positions[next]) : Position.Right,
            target: prev && positions[prev] ? facing(here, positions[prev]) : Position.Left,
        };
    }
    return sides;
}

function facing(from: NodePosition, to: NodePosition): Position {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
        return dx >= 0 ? Position.Right : Position.Left;
    }
    return dy >= 0 ? Position.Bottom : Position.Top;
}
