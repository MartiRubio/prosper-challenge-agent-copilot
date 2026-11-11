import { MarkerType, Position, type Edge, type Node } from "@xyflow/react";

import type { AgentDocument, NodePosition } from "../editor/agentDocument";
import { arrangeNodes } from "./arrangeNodes";
import { handleSides } from "./handleSides";
import type { DrawnEdge } from "./drawnEdge";
import { END_ID, START_ID } from "./markers";

export type FlowEdgeData = DrawnEdge & {
    removable: boolean;
};

export type ReviewMarks = {
    nodes: Record<string, "add" | "change" | "remove">;
    edges: Record<string, "add" | "change" | "remove">;
    hot: string[];
};

const markerEnd = { type: MarkerType.ArrowClosed, color: "var(--edge)" };

export function flowStructureKey(document: AgentDocument): string {
    const nodes = document.nodes.map((node) => {
        const edges = (node.edges ?? []).map((edge) => `${edge.function}>${edge.target}`).join(",");
        return `${node.name}|${node.end ? 1 : 0}|${edges}`;
    });
    return `${document.initial_node}#${nodes.join(";")}`;
}

export function projectNodes(
    document: AgentDocument,
    current: Node[],
    activeNodeName: string | null,
    carry: { from: string; to: string } | null,
    review: ReviewMarks | null = null,
): Node[] {
    const positions = placedPositions(document, current, carry);
    const sides = handleSides(positions);
    const selected = new Set(current.filter((node) => node.selected).map((node) => node.id));
    if (carry && selected.has(carry.from)) {
        selected.delete(carry.from);
        selected.add(carry.to);
    }
    const nodes: Node[] = [
        flowNode(START_ID, "marker", { label: "Start" }, positions, sides, selected, activeNodeName, review),
        ...document.nodes.map((node) =>
            flowNode(node.name, "step", {}, positions, sides, selected, activeNodeName, review),
        ),
        flowNode(END_ID, "marker", { label: "End" }, positions, sides, selected, activeNodeName, review),
    ];
    return sameNodes(current, nodes) ? current : nodes;
}

export function projectEdges(document: AgentDocument, current: Edge[], review: ReviewMarks | null = null): Edge[] {
    const selected = new Set(current.filter((edge) => edge.selected).map((edge) => edge.id));
    const edges: Edge[] = [];
    if (document.nodes.some((node) => node.name === document.initial_node)) {
        edges.push(flowEdge("marker:start", START_ID, document.initial_node, undefined, {
            kind: "start",
            source: START_ID,
            removable: false,
        }, selected));
    }
    for (const node of document.nodes) {
        for (const edge of node.edges ?? []) {
            edges.push(flowEdge(`edge:${node.name}:${edge.function}`, node.name, edge.target, undefined, {
                kind: "step",
                source: node.name,
                functionName: edge.function,
                removable: true,
                review: review?.edges[`${node.name}:${edge.function}`],
            }, selected));
        }
        if (node.end) {
            edges.push(flowEdge(`marker:end:${node.name}`, node.name, END_ID, undefined, {
                kind: "end",
                source: node.name,
                removable: true,
                review: review?.edges[`${node.name}:end`],
            }, selected));
        }
    }
    return sameEdges(current, edges) ? current : edges;
}

function placedPositions(
    document: AgentDocument,
    current: Node[],
    carry: { from: string; to: string } | null,
): Record<string, NodePosition> {
    const fresh = arrangeNodes(document);
    const positions: Record<string, NodePosition> = { ...fresh };
    for (const node of current) {
        positions[node.id] = node.position;
    }
    // A new step goes where a fresh layout puts it. If that spot is already
    // taken by a step that was moved or laid out earlier, lay everything out again.
    const known = new Set(current.map((node) => node.id));
    const added = Object.keys(fresh).filter((id) => !known.has(id));
    const collides = added.some((id) => current.some((node) => overlaps(fresh[id], node.position)));
    if (collides) {
        return { ...fresh };
    }
    if (carry && positions[carry.from]) {
        positions[carry.to] = positions[carry.from];
    }
    return positions;
}

function overlaps(a: NodePosition, b: NodePosition): boolean {
    return Math.abs(a.x - b.x) < 200 && Math.abs(a.y - b.y) < 70;
}

function flowNode(
    id: string,
    type: string,
    data: Record<string, unknown>,
    positions: Record<string, NodePosition>,
    sides: Record<string, { source: Position; target: Position }>,
    selected: Set<string>,
    activeNodeName: string | null,
    review: ReviewMarks | null,
): Node {
    const pointed = sides[id];
    const classes = [
        id === activeNodeName ? "active-call-node" : "",
        review?.nodes[id] ? `review-${review.nodes[id]}` : "",
        review?.hot.includes(id) ? "review-hot" : "",
    ].filter(Boolean);
    return {
        id,
        type,
        position: positions[id] ?? { x: 0, y: 0 },
        data,
        selected: selected.has(id),
        sourcePosition: pointed?.source ?? Position.Bottom,
        targetPosition: pointed?.target ?? Position.Top,
        deletable: false,
        className: classes.join(" ") || undefined,
    };
}

function flowEdge(
    id: string,
    source: string,
    target: string,
    sourceHandle: string | undefined,
    data: FlowEdgeData,
    selected: Set<string>,
): Edge<FlowEdgeData> {
    return {
        id,
        source,
        target,
        sourceHandle,
        type: "function",
        data,
        selected: selected.has(id),
        markerEnd,
        style: { stroke: "var(--edge)", strokeWidth: 1.6 },
    };
}

function sameNodes(current: Node[], next: Node[]): boolean {
    if (current.length !== next.length) {
        return false;
    }
    return next.every((node, index) => {
        const previous = current[index];
        return previous
            && previous.id === node.id
            && previous.position.x === node.position.x
            && previous.position.y === node.position.y
            && previous.selected === node.selected
            && previous.className === node.className
            && previous.type === node.type
            && previous.sourcePosition === node.sourcePosition
            && previous.targetPosition === node.targetPosition;
    });
}

function sameEdges(current: Edge[], next: Edge[]): boolean {
    if (current.length !== next.length) {
        return false;
    }
    return next.every((edge, index) => {
        const previous = current[index];
        return previous
            && previous.id === edge.id
            && previous.source === edge.source
            && previous.target === edge.target
            && previous.sourceHandle === edge.sourceHandle
            && previous.selected === edge.selected
            && (previous.data as FlowEdgeData | undefined)?.review === edge.data?.review;
    });
}
