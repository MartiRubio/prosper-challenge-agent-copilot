import { useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";

export function StepNode({ id, sourcePosition, targetPosition }: NodeProps) {
    const updateInternals = useUpdateNodeInternals();
    useEffect(() => {
        updateInternals(id);
    }, [id, sourcePosition, targetPosition, updateInternals]);
    return (
        <div className="step-node" title="Double-click to edit the spoken task">
            <Handle type="target" position={targetPosition ?? Position.Left} />
            <span className="step-name">{id}</span>
            <Handle type="source" position={sourcePosition ?? Position.Right} />
        </div>
    );
}
