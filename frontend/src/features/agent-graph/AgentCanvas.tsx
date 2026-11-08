import { Background, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { AgentDocument } from "../editor/agentDocument";
import { toFlowGraph } from "./toFlowGraph";

type AgentCanvasProps = {
    document: AgentDocument;
    selectedNodeName: string | null;
    onSelectNode: (nodeName: string | null) => void;
};

export function AgentCanvas({ document, selectedNodeName, onSelectNode }: AgentCanvasProps) {
    const graph = toFlowGraph(document);
    const nodes = graph.nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeName,
    }));
    return (
        <div className="agent-canvas">
            <ReactFlow
                nodes={nodes}
                edges={graph.edges}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                onNodeClick={(_event, node) => onSelectNode(node.id)}
                onPaneClick={() => onSelectNode(null)}
            >
                <Background />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}
