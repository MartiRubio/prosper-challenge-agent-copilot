import { Position } from "@xyflow/react";

import type { AgentDocument, NodePosition } from "../editor/agentDocument";

export function handleSides(
    document: AgentDocument,
    positions: Record<string, NodePosition>,
): Record<string, { source: Position; target: Position }> {
    void document.initial_node;
    const sides: Record<string, { source: Position; target: Position }> = {};
    for (const id of Object.keys(positions)) {
        sides[id] = { source: Position.Bottom, target: Position.Top };
    }
    return sides;
}
