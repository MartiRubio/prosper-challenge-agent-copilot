import { MarkerType, Position, type Edge, type Node } from "@xyflow/react";

import type { AgentDocument, NodePosition } from "../editor/agentDocument";
import { arrangeNodes } from "./arrangeNodes";
import { handleSides } from "./handleSides";
import type { DrawnEdge } from "./drawnEdge";
import { END_ID, START_ID } from "./markers";

export type FlowEdgeData = DrawnEdge & {
    removable: boolean;
};

const markerEnd = { type: MarkerType.ArrowClosed, color: "#0f6e56" };

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
): Node[] {
    const positions = placedPositions(document, current, carry);
    const sides = handleSides(document, positions);
    const selected = new Set(current.filter((node) => node.selected).map((node) => node.id));
    if (carry && selected.has(carry.from)) {
        selected.delete(carry.from);
        selected.add(carry.to);
    }
    const nodes: Node[] = [
        flowNode(START_ID, "marker", { label: "Start" }, positions, sides, selected, activeNodeName),
        ...document.nodes.map((node) =>
            flowNode(node.name, "step", {}, positions, sides, selected, activeNodeName),
        ),
        flowNode(END_ID, "marker", { label: "End" }, positions, sides, selected, activeNodeName),
    ];
    return sameNodes(current, nodes) ? current : nodes;
}

export function projectEdges(document: AgentDocument, current: Edge[]): Edge[] {
    const selected = new Set(current.filter((edge) => edge.selected).map((edge) => edge.id));
    const edges: Edge[] = [];
    if (document.nodes.some((node) => node.name === document.initial_node)) {
        edges.push(flowEdge("marker:start", START_ID, document.initial_node, {
            kind: "start",
            source: START_ID,
            removable: false,
        }, selected));
    }
    for (const node of document.nodes) {
        for (const edge of node.edges ?? []) {
            edges.push(flowEdge(`edge:${node.name}:${edge.function}`, node.name, edge.target, {
                kind: "step",
                source: node.name,
                functionName: edge.function,
                removable: true,
            }, selected));
        }
        if (node.end) {
            edges.push(flowEdge(`marker:end:${node.name}`, node.name, END_ID, {
                kind: "end",
                source: node.name,
                removable: true,
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
    const positions: Record<string, NodePosition> = { ...arrangeNodes(document) };
    for (const node of current) {
        positions[node.id] = node.position;
    }
    if (carry && positions[carry.from]) {
        positions[carry.to] = positions[carry.from];
    }
    return positions;
}

function flowNode(
    id: string,
    type: string,
    data: Record<string, unknown>,
    positions: Record<string, NodePosition>,
    sides: Record<string, { source: Position; target: Position }>,
    selected: Set<string>,
    activeNodeName: string | null,
): Node {
    const pointed = sides[id];
    return {
        id,
        type,
        position: positions[id] ?? { x: 0, y: 0 },
        data,
        selected: selected.has(id),
        sourcePosition: pointed?.source ?? Position.Right,
        targetPosition: pointed?.target ?? Position.Left,
        deletable: false,
        className: id === activeNodeName ? "active-call-node" : undefined,
    };
}

function flowEdge(
    id: string,
    source: string,
    target: string,
    data: FlowEdgeData,
    selected: Set<string>,
): Edge<FlowEdgeData> {
    return {
        id,
        source,
        target,
        type: "removable",
        data,
        selected: selected.has(id),
        markerEnd,
        style: { stroke: "#0f6e56", strokeWidth: 1.6 },
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
            && previous.selected === edge.selected;
    });
}
