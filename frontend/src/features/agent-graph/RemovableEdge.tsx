import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";

import { functionOptions } from "../graph-edits/editEdge";
import { isPlainFunction, NO_FUNCTION } from "../graph-edits/plainFunction";
import { useGraphActions } from "./GraphActions";
import type { FlowEdgeData } from "./syncFlow";

export function RemovableEdge({
    id,
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
    const { document, functions, assignFunction } = useGraphActions();
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });
    const review = edge?.review;
    const stroke = review === "add" ? "#1f7a4d" : review === "remove" ? "#9a3412" : "#0f6e56";
    const edgeStyle = {
        ...style,
        stroke,
        strokeDasharray: review === "remove" ? "6 4" : undefined,
        opacity: review === "remove" ? 0.55 : 1,
    };
    if (edge?.kind !== "step" || !edge.functionName) {
        return <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />;
    }
    const current = edge.functionName;
    const options = functionOptions(document, edge.source, current, functions);
    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
            <EdgeLabelRenderer>
                <div
                    className="edge-function nodrag nopan"
                    style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
                >
                    <select
                        className="pill-input nodrag nopan"
                        aria-label={`Function for ${id}`}
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
                </div>
            </EdgeLabelRenderer>
        </>
    );
}

export const edgeTypes = { removable: RemovableEdge };
