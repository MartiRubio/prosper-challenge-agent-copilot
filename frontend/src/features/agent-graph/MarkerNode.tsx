import { useEffect } from "react";
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";

import { START_ID } from "./markers";

export function MarkerNode({ id, data, sourcePosition, targetPosition }: NodeProps) {
    const label = typeof data.label === "string" ? data.label : "";
    const start = id === START_ID;
    const updateInternals = useUpdateNodeInternals();
    useEffect(() => {
        updateInternals(id);
    }, [id, sourcePosition, targetPosition, updateInternals]);
    return (
        <div className="marker-node">
            {start ? null : <Handle type="target" position={targetPosition ?? Position.Top} />}
            {label}
            {start ? <Handle type="source" position={sourcePosition ?? Position.Bottom} /> : null}
        </div>
    );
}
