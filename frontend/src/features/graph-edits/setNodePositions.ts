import type { AgentDocument, NodePosition } from "../editor/agentDocument";

export function setNodePositions(
    document: AgentDocument,
    moves: { id: string; position: NodePosition }[],
): AgentDocument {
    const next = structuredClone(document);
    const layout = { ...(next.layout ?? {}) };
    for (const move of moves) {
        layout[move.id] = { x: move.position.x, y: move.position.y };
    }
    next.layout = layout;
    return next;
}
