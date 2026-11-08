import type { AgentDocument, NodePosition } from "../editor/agentDocument";

const COLUMN_X = 80;
const ROW_GAP = 150;

export function defaultLayout(document: AgentDocument): Record<string, NodePosition> {
    const positions: Record<string, NodePosition> = {};
    document.nodes.forEach((node, index) => {
        positions[node.name] = document.layout?.[node.name] ?? {
            x: COLUMN_X,
            y: 40 + index * ROW_GAP,
        };
    });
    return positions;
}
