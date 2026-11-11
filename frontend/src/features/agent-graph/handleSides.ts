import { Position } from "@xyflow/react";

import type { NodePosition } from "../editor/agentDocument";

export function handleSides(
    positions: Record<string, NodePosition>,
): Record<string, { source: Position; target: Position }> {
    const sides: Record<string, { source: Position; target: Position }> = {};
    for (const id of Object.keys(positions)) {
        sides[id] = { source: Position.Bottom, target: Position.Top };
    }
    return sides;
}
