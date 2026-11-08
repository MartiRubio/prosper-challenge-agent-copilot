import { Background, Controls, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { AgentDocument } from "../editor/agentDocument";
import { toFlowGraph } from "./toFlowGraph";

type NodeMove = {
    id: string;
    position: { x: number; y: number };
};

type AgentCanvasProps = {
    document: AgentDocument;
    selectedNodeName: string | null;
    activeNodeName: string | null;
    onSelectNode: (nodeName: string | null) => void;
    onMoveNodes: (moves: NodeMove[]) => void;
};

export function AgentCanvas({
    document,
    selectedNodeName,
    activeNodeName,
    onSelectNode,
    onMoveNodes,
}: AgentCanvasProps) {
    const graph = toFlowGraph(document);
    const nodes = graph.nodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeName,
        className: node.id === activeNodeName ? "active-call-node" : undefined,
    }));
    return (
        <div className="agent-canvas">
            <ReactFlow
                nodes={nodes}
                edges={graph.edges}
                onInit={(instance) => {
                    void instance.fitView();
                }}
                nodesConnectable={false}
                onNodeClick={(_event, node) => onSelectNode(node.id)}
                onPaneClick={() => onSelectNode(null)}
                onNodesChange={(changes) => {
                    const moves: NodeMove[] = [];
                    for (const change of changes) {
                        if (change.type !== "position" || !change.position || change.dragging === undefined) {
                            continue;
                        }
                        const rendered = graph.nodes.find((node) => node.id === change.id);
                        if (
                            rendered &&
                            rendered.position.x === change.position.x &&
                            rendered.position.y === change.position.y
                        ) {
                            continue;
                        }
                        moves.push({ id: change.id, position: change.position });
                    }
                    if (moves.length > 0) {
                        onMoveNodes(moves);
                    }
                }}
            >
                <Background />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    );
}
