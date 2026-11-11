import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { X } from "lucide-react";

import { functionOptions } from "../graph-edits/editEdge";
import { isPlainFunction, NO_FUNCTION } from "../graph-edits/plainFunction";
import { useGraphActions } from "./GraphActions";
import { pickerWidth, useLabelPoint } from "./labelPlacement";
import type { FlowEdgeData } from "./syncFlow";

export function FunctionEdge({
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    style,
    data,
}: EdgeProps) {
    const edge = data as FlowEdgeData | undefined;
    const { document, functions, assignFunction, removeEdge, locked } = useGraphActions();
    const [edgePath, middleX, middleY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });
    // A spot further along the arrow when the middle is taken by another label or a step.
    const placed = useLabelPoint(id);
    const labelX = placed?.x ?? middleX;
    const labelY = placed?.y ?? middleY;
    const review = edge?.review;
    const edgeStyle = {
        ...style,
        stroke: reviewStroke(review),
        strokeDasharray: review === "remove" ? "6 4" : undefined,
        opacity: review === "remove" ? 0.55 : 1,
    };
    const remove = edge?.removable && !locked && edge.review !== "add" ? (
        <button
            type="button"
            className="edge-remove nodrag nopan"
            aria-label={`Remove the arrow from ${source} to ${target}`}
            title="Remove this arrow"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
                event.stopPropagation();
                removeEdge(edge);
            }}
        >
            <X aria-hidden="true" />
        </button>
    ) : null;
    if (edge?.kind !== "step" || !edge.functionName) {
        return (
            <>
                <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} interactionWidth={24} />
                {remove ? (
                    <EdgeLabelRenderer>
                        <div
                            className="edge-function edge-plain nodrag nopan"
                            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
                        >
                            {remove}
                        </div>
                    </EdgeLabelRenderer>
                ) : null}
            </>
        );
    }
    const current = edge.functionName;
    const options = functionOptions(document, edge.source, current, functions);
    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} interactionWidth={24} />
            <EdgeLabelRenderer>
                <div
                    className="edge-function nodrag nopan"
                    style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
                >
                    <select
                        className="pill-input nodrag nopan"
                        title={isPlainFunction(current) ? "No function" : current}
                        style={{ width: pickerWidth(current) }}
                        aria-label={`Function for arrow from ${source} to ${target}`}
                        value={isPlainFunction(current) ? NO_FUNCTION : current}
                        onPointerDown={(event) => event.stopPropagation()}
                        onChange={(event) => assignFunction(edge.source, current, event.target.value)}
                    >
                        {options.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                    {remove}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}

function reviewStroke(review: FlowEdgeData["review"]): string {
    if (review === "add") {
        return "var(--review-add)";
    }
    if (review === "change") {
        return "var(--review-change)";
    }
    if (review === "remove") {
        return "var(--review-remove)";
    }
    return "var(--edge)";
}

export const edgeTypes = { function: FunctionEdge };
