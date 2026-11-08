import type { AgentDocument, NodePosition } from "../editor/agentDocument";
import { END_ID, START_ID } from "./markers";

const PER_ROW = 3;
const DEPTH_GAP = 340;
const ROW_GAP = 220;
const SIBLING_GAP = 120;

export function arrangeNodes(document: AgentDocument): Record<string, NodePosition> {
    const ids = nodeIds(document);
    const layer = layers(document, ids);
    const columns = new Map<number, string[]>();
    for (const id of ids) {
        const depth = layer.get(id) ?? 0;
        const column = columns.get(depth) ?? [];
        column.push(id);
        columns.set(depth, column);
    }
    const positions: Record<string, NodePosition> = {};
    for (const [depth, column] of columns) {
        const rowIndex = Math.floor(depth / PER_ROW);
        const slot = depth % PER_ROW;
        const columnIndex = rowIndex % 2 === 0 ? slot : PER_ROW - 1 - slot;
        column.forEach((id, index) => {
            positions[id] = {
                x: 40 + columnIndex * DEPTH_GAP,
                y: 48 + rowIndex * ROW_GAP + index * SIBLING_GAP,
            };
        });
    }
    return positions;
}

export function nodeIds(document: AgentDocument): string[] {
    return [START_ID, ...document.nodes.map((node) => node.name), END_ID];
}

function layers(document: AgentDocument, ids: string[]): Map<string, number> {
    const outgoing = new Map<string, string[]>();
    outgoing.set(START_ID, document.nodes.some((node) => node.name === document.initial_node) ? [document.initial_node] : []);
    for (const node of document.nodes) {
        const targets = (node.edges ?? []).map((edge) => edge.target);
        if (node.end) {
            targets.push(END_ID);
        }
        outgoing.set(node.name, targets);
    }
    const layer = new Map<string, number>();
    const queue = [START_ID];
    layer.set(START_ID, 0);
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            break;
        }
        const depth = layer.get(current) ?? 0;
        for (const target of outgoing.get(current) ?? []) {
            if (!ids.includes(target) || layer.has(target)) {
                continue;
            }
            layer.set(target, depth + 1);
            queue.push(target);
        }
    }
    let deepest = 0;
    for (const [id, depth] of layer) {
        if (id !== END_ID) {
            deepest = Math.max(deepest, depth);
        }
    }
    for (const node of document.nodes) {
        if (!layer.has(node.name)) {
            deepest += 1;
            layer.set(node.name, deepest);
        }
    }
    layer.set(END_ID, deepest + 1);
    return layer;
}
