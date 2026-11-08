import { useEffect, useMemo, useState } from "react";
import {
    Background,
    Controls,
    ReactFlow,
    useEdgesState,
    useNodesState,
    type Connection,
    type Edge,
    type EdgeChange,
    type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { AgentDocument } from "../editor/agentDocument";
import type { FunctionTemplate } from "../function-catalog/functionTemplate";
import { assignEdgeFunction } from "../graph-edits/editEdge";
import { canConnect, connectNodes } from "../graph-edits/connectNodes";
import { disconnectEdge } from "../graph-edits/disconnectEdge";
import { addNode, removeNode, renameNode, setTaskContent } from "../graph-edits/updateNode";
import { arrangeNodes } from "./arrangeNodes";
import { handleSides } from "./handleSides";
import { CanvasTools } from "./CanvasTools";
import { edgeTypes } from "./RemovableEdge";
import { GraphActionsProvider, type GraphActions } from "./GraphActions";
import { isCallMarker } from "./markers";
import { nodeTypes } from "./nodeTypes";
import { PromptEditor } from "../prompt-editor/PromptEditor";
import { flowStructureKey, projectEdges, projectNodes, type FlowEdgeData } from "./syncFlow";

type AgentCanvasProps = {
    document: AgentDocument;
    activeNodeName: string | null;
    onChange: (document: AgentDocument) => void;
    functions: FunctionTemplate[];
    picking?: boolean;
    onPick?: (nodeName: string) => void;
};

export function AgentCanvas({ document, activeNodeName, onChange, functions, picking = false, onPick }: AgentCanvasProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(projectNodes(document, [], null, null));
    const [edges, setEdges, applyEdgeChanges] = useEdgesState<Edge>(projectEdges(document, []));
    const [arrangeToken, setArrangeToken] = useState(0);
    const [carry, setCarry] = useState<{ from: string; to: string } | null>(null);
    const [pendingSelect, setPendingSelect] = useState<string | null>(null);
    const [taskNode, setTaskNode] = useState<string | null>(null);
    const structure = flowStructureKey(document);
    const spokenTask = document.nodes.find((node) => node.name === taskNode)?.task_messages?.[0]?.content ?? "";

    useEffect(() => {
        setNodes((current) => {
            const next = projectNodes(document, current, activeNodeName, carry);
            if (!pendingSelect) {
                return next;
            }
            return next.map((node) => ({ ...node, selected: node.id === pendingSelect }));
        });
        setEdges((current) => projectEdges(document, current));
        if (carry) {
            setCarry(null);
        }
        if (pendingSelect) {
            setPendingSelect(null);
        }
    }, [structure, activeNodeName, carry, pendingSelect, document, setNodes, setEdges]);

    const actions = useMemo<GraphActions>(() => ({
        document,
        functions,
        renameNode(from, to) {
            const next = renameNode(document, from, to);
            if (next === document) {
                return;
            }
            setCarry({ from, to: to.trim() });
            onChange(next);
        },
        setTask(nodeName, content) {
            onChange(setTaskContent(document, nodeName, content));
        },
        assignFunction(source, functionName, choice) {
            onChange(assignEdgeFunction(document, source, functionName, choice, functions));
        },
    }), [document, functions, onChange]);

    function onEdgesChange(changes: EdgeChange[]) {
        const blocked = new Set(
            changes.flatMap((change) => {
                if (change.type !== "remove" || edgeById(edges, change.id)?.removable) {
                    return [];
                }
                return [change.id];
            }),
        );
        const allowed = changes.filter((change) => change.type !== "remove" || !blocked.has(change.id));
        applyEdgeChanges(allowed);
        let next = document;
        for (const change of allowed) {
            if (change.type !== "remove") {
                continue;
            }
            const edge = edgeById(edges, change.id);
            if (edge) {
                next = disconnectEdge(next, edge);
            }
        }
        if (next !== document) {
            onChange(next);
        }
    }

    function renameTaskNode(nextName: string): boolean {
        if (!taskNode) {
            return false;
        }
        const next = renameNode(document, taskNode, nextName);
        if (next === document) {
            return false;
        }
        const trimmed = nextName.trim();
        setCarry({ from: taskNode, to: trimmed });
        setTaskNode(trimmed);
        onChange(next);
        return true;
    }

    function onConnect(connection: Connection) {
        if (!connection.source || !connection.target) {
            return;
        }
        const next = connectNodes(document, connection.source, connection.target);
        if (next !== document) {
            onChange(next);
        }
    }

    function arrange() {
        const positions = arrangeNodes(document);
        const sides = handleSides(document, positions);
        setNodes((current) => current.map((node) => ({
            ...node,
            position: positions[node.id] ?? node.position,
            sourcePosition: sides[node.id]?.source ?? node.sourcePosition,
            targetPosition: sides[node.id]?.target ?? node.targetPosition,
        })));
        setArrangeToken((token) => token + 1);
    }

    function addStep() {
        const next = addNode(document);
        setPendingSelect(next.nodes[next.nodes.length - 1]?.name ?? null);
        onChange(next);
    }

    function removeSelected() {
        const node = nodes.find((item) => item.selected && !isCallMarker(item.id));
        if (node) {
            if (document.nodes.length <= 1) {
                return;
            }
            onChange(removeNode(document, node.id));
            return;
        }
        const edge = edges.find((item) => item.selected);
        const data = edge?.data as FlowEdgeData | undefined;
        if (data?.removable) {
            onChange(disconnectEdge(document, data));
        }
    }

    const canRemove = nodes.some((node) => node.selected && !isCallMarker(node.id) && document.nodes.length > 1)
        || edges.some((edge) => edge.selected && (edge.data as FlowEdgeData | undefined)?.removable);

    return (
        <div className={picking ? "agent-canvas is-picking" : "agent-canvas"}>
            <GraphActionsProvider value={actions}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onInit={(instance) => {
                        void instance.fitView({ padding: 0.2 });
                    }}
                    minZoom={0.85}
                    nodesConnectable
                    zoomOnDoubleClick={false}
                    isValidConnection={(connection) => canConnect(document, connection.source, connection.target)}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={(event, node) => {
                        setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
                        const target = event.target;
                        if (!(target instanceof Element) || target.closest("input, textarea, select, button, .react-flow__handle")) {
                            return;
                        }
                        if (!picking || !onPick || isCallMarker(node.id)) {
                            return;
                        }
                        onPick(node.id);
                    }}
                    onNodeDoubleClick={(event, node) => {
                        if (picking) {
                            return;
                        }
                        const target = event.target;
                        if (!(target instanceof Element) || target.closest(".react-flow__handle") || isCallMarker(node.id)) {
                            return;
                        }
                        setTaskNode(node.id);
                    }}
                    onEdgeClick={() => {
                        setNodes((current) => current.map((node) => ({ ...node, selected: false })));
                    }}
                >
                    <CanvasTools
                        arrangeToken={arrangeToken}
                        canRemove={canRemove}
                        onArrange={arrange}
                        onRemove={removeSelected}
                        onAdd={addStep}
                    />
                    <Background />
                    <Controls showInteractive={false} />
                </ReactFlow>
            </GraphActionsProvider>
            {taskNode && document.nodes.some((node) => node.name === taskNode) && (
                <PromptEditor
                    title={taskNode}
                    label="Spoken task"
                    value={spokenTask}
                    model={document.model ?? "gpt-4o"}
                    name={taskNode}
                    onRename={renameTaskNode}
                    onChange={(content) => onChange(setTaskContent(document, taskNode, content))}
                    onClose={() => setTaskNode(null)}
                />
            )}
        </div>
    );
}

function edgeById(edges: Edge[], id: string): FlowEdgeData | undefined {
    return edges.find((edge) => edge.id === id)?.data as FlowEdgeData | undefined;
}
