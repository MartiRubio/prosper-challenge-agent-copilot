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
    if (edge?.kind !== "step" || !edge.functionName) {
        return <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />;
    }
    const current = edge.functionName;
    const options = functionOptions(document, edge.source, current, functions);
    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>
                <div
                    className="edge-function nodrag nopan"
                    style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
                >
                    <select
                        className="pill-input"
                        aria-label={`Function for ${id}`}
                        value={isPlainFunction(current) ? NO_FUNCTION : current}
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
