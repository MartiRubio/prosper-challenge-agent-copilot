import { useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";

export function StepNode({ id, sourcePosition, targetPosition }: NodeProps) {
    const updateInternals = useUpdateNodeInternals();
    useEffect(() => {
        updateInternals(id);
    }, [id, sourcePosition, targetPosition, updateInternals]);
    return (
        <div className="step-node" title="Click to edit what this step says">
            <Handle type="target" position={targetPosition ?? Position.Top} />
            <span className="step-name">{id}</span>
            <Handle type="source" position={sourcePosition ?? Position.Bottom} />
        </div>
    );
}
