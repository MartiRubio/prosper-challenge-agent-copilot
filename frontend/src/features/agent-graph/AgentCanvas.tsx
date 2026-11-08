import { Background, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { AgentDocument } from "../editor/agentDocument";
import { toFlowGraph } from "./toFlowGraph";

type AgentCanvasProps = {
    document: AgentDocument;
};

export function AgentCanvas({ document }: AgentCanvasProps) {
    const graph = toFlowGraph(document);
    return (
        <div className="agent-canvas">
            <ReactFlow
                nodes={graph.nodes}
                edges={graph.edges}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
            >
                <Background />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}
