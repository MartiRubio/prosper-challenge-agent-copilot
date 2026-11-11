import { createContext, useContext } from "react";
import type { Edge, Node } from "@xyflow/react";

import type { FlowEdgeData } from "./syncFlow";

export type LabelPoint = { x: number; y: number };

type Box = { x: number; y: number; width: number; height: number };

const LABEL_HEIGHT = 30;
const BUTTON_ONLY = { width: 26, height: 26 };
// Spots along the arrow to try, from the middle outwards.
const SPOTS = [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78, 0.15, 0.85];
const GAP = 6;

/** The function picker's width; the edge draws it at exactly this width so placement can trust it. */
export function pickerWidth(functionName: string): number {
    return Math.round(Math.min(160, Math.max(96, functionName.length * 7 + 34)));
}

/** How wide an arrow's label is drawn: the function picker plus its remove button. */
export function labelWidth(functionName: string | undefined): number {
    if (!functionName) {
        return BUTTON_ONLY.width;
    }
    return pickerWidth(functionName) + 26;
}

/**
 * Where each arrow's label goes. Every label stays on its own arrow, sliding
 * from the middle towards either end until it no longer covers a step or a
 * label placed before it. Arrows leaving the same step all start in the same
 * spot, which is what made their labels pile up.
 */
export function placeLabels(nodes: Node[], edges: Edge[]): Record<string, LabelPoint> {
    const boxes = new Map(nodes.map((node) => [node.id, nodeBox(node)]));
    const taken: Box[] = [...boxes.values()].map((box) => grow(box, GAP));
    const placed: Record<string, LabelPoint> = {};
    const ordered = [...edges].sort((a, b) => {
        const sa = boxes.get(a.source);
        const sb = boxes.get(b.source);
        return (sa?.y ?? 0) - (sb?.y ?? 0) || (sa?.x ?? 0) - (sb?.x ?? 0) || a.id.localeCompare(b.id);
    });
    for (const edge of ordered) {
        const source = boxes.get(edge.source);
        const target = boxes.get(edge.target);
        if (!source || !target) {
            continue;
        }
        const data = edge.data as FlowEdgeData | undefined;
        const named = data?.kind === "step" ? data.functionName : undefined;
        const size = named ? { width: labelWidth(named), height: LABEL_HEIGHT } : BUTTON_ONLY;
        const from = { x: source.x + source.width / 2, y: source.y + source.height };
        const to = { x: target.x + target.width / 2, y: target.y };
        let best: { point: LabelPoint; cost: number } | null = null;
        for (const t of SPOTS) {
            const point = bezierPoint(from, to, t);
            const box = { x: point.x - size.width / 2, y: point.y - size.height / 2, ...size };
            const cost = taken.reduce((sum, other) => sum + overlap(box, other), 0);
            if (!best || cost < best.cost) {
                best = { point, cost };
            }
            if (cost === 0) {
                break;
            }
        }
        if (best) {
            placed[edge.id] = best.point;
            taken.push(grow({ x: best.point.x - size.width / 2, y: best.point.y - size.height / 2, ...size }, GAP));
        }
    }
    return placed;
}

/** The same curve React Flow draws for a bottom-to-top bezier edge. */
function bezierPoint(from: LabelPoint, to: LabelPoint, t: number): LabelPoint {
    const distance = to.y - from.y;
    const offset = distance >= 0 ? 0.5 * distance : 0.25 * 25 * Math.sqrt(-distance);
    const c1 = { x: from.x, y: from.y + offset };
    const c2 = { x: to.x, y: to.y - offset };
    const u = 1 - t;
    return {
        x: u * u * u * from.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * to.x,
        y: u * u * u * from.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * to.y,
    };
}

function nodeBox(node: Node): Box {
    return {
        x: node.position.x,
        y: node.position.y,
        width: node.measured?.width ?? node.width ?? 180,
        height: node.measured?.height ?? node.height ?? 52,
    };
}

function grow(box: Box, by: number): Box {
    return { x: box.x - by, y: box.y - by, width: box.width + by * 2, height: box.height + by * 2 };
}

function overlap(a: Box, b: Box): number {
    const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    return width > 0 && height > 0 ? width * height : 0;
}

export const LabelPlacementContext = createContext<Record<string, LabelPoint>>({});

export function useLabelPoint(edgeId: string): LabelPoint | undefined {
    return useContext(LabelPlacementContext)[edgeId];
}
