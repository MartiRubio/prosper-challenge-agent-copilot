import { useEffect, useMemo, useRef, useState } from "react";
import {
    Background,
    Controls,
    Panel,
    ReactFlow,
    getNodesBounds,
    useEdgesState,
    useNodesState,
    useViewport,
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
import { edgeTypes } from "./FunctionEdge";
import { GraphActionsProvider, type GraphActions } from "./GraphActions";
import { isMarker } from "./markers";
import { nodeTypes } from "./nodeTypes";
import type { FocusChip } from "../copilot/focus";
import { flowStructureKey, projectEdges, projectNodes, type FlowEdgeData, type ReviewMarks } from "./syncFlow";

type AgentCanvasProps = {
    document: AgentDocument;
    activeNodeName: string | null;
    onChange: (document: AgentDocument) => void;
    functions: FunctionTemplate[];
    picking?: boolean;
    onPick?: (nodeName: string) => void;
    review?: ReviewMarks | null;
    locked?: boolean;
    onFocus?: (chips: FocusChip[]) => void;
    renameCarry?: { from: string; to: string } | null;
    onOpenNode?: (nodeName: string) => void;
    promptOpen?: boolean;
    onOpenPrompt?: () => void;
};

export function AgentCanvas({
    document,
    activeNodeName,
    onChange,
    functions,
    picking = false,
    onPick,
    review = null,
    locked = false,
    onFocus,
    renameCarry = null,
    onOpenNode,
    promptOpen = false,
    onOpenPrompt,
}: AgentCanvasProps) {
    const [initialNodes] = useState(() => projectNodes(document, [], null, null));
    const [initialEdges] = useState(() => projectEdges(document, []));
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
    const [edges, setEdges, applyEdgeChanges] = useEdgesState<Edge>(initialEdges);
    const [arrangeToken, setArrangeToken] = useState(0);
    const [carry, setCarry] = useState<{ from: string; to: string } | null>(null);
    const [pendingSelect, setPendingSelect] = useState<string | null>(null);
    const structure = flowStructureKey(document);
    const reviewKey = JSON.stringify(review ?? null);
    const placedCarry = carry ?? renameCarry;
    const stepsKey = document.nodes.map((node) => node.name).join("|");
    const seenSteps = useRef(stepsKey);

    // A step that appears or disappears (a kept or previewed copilot change) can
    // re-lay the graph, so fit it back into view.
    useEffect(() => {
        if (seenSteps.current === stepsKey) {
            return;
        }
        seenSteps.current = stepsKey;
        const handle = window.setTimeout(() => setArrangeToken((token) => token + 1), 220);
        return () => window.clearTimeout(handle);
    }, [stepsKey]);

    useEffect(() => {
        setNodes((current) => {
            const next = projectNodes(document, current, activeNodeName, placedCarry, review);
            if (!pendingSelect) {
                return next;
            }
            return next.map((node) => ({ ...node, selected: node.id === pendingSelect }));
        });
        setEdges((current) => projectEdges(document, current, review));
        if (carry) {
            setCarry(null);
        }
        if (pendingSelect) {
            setPendingSelect(null);
        }
    }, [structure, reviewKey, activeNodeName, placedCarry, pendingSelect, document, review, setNodes, setEdges]);

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
                if (change.type !== "remove" || (!locked && edgeById(edges, change.id)?.removable)) {
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

    function onConnect(connection: Connection) {
        if (locked || !connection.source || !connection.target) {
            return;
        }
        const next = connectNodes(document, connection.source, connection.target);
        if (next !== document) {
            onChange(next);
        }
    }

    function arrange() {
        const sizes: Record<string, { width: number; height: number }> = {};
        for (const node of nodes) {
            const width = node.measured?.width ?? node.width;
            const height = node.measured?.height ?? node.height;
            if (width && height) {
                sizes[node.id] = { width, height };
            }
        }
        const positions = arrangeNodes(document, sizes);
        const sides = handleSides(positions);
        setNodes((current) => current.map((node) => ({
            ...node,
            position: positions[node.id] ?? node.position,
            sourcePosition: sides[node.id]?.source ?? node.sourcePosition,
            targetPosition: sides[node.id]?.target ?? node.targetPosition,
        })));
        setArrangeToken((token) => token + 1);
    }

    function addStep() {
        if (locked) {
            return;
        }
        const next = addNode(document);
        setPendingSelect(next.nodes[next.nodes.length - 1]?.name ?? null);
        onChange(next);
    }

    function removeSelected() {
        if (locked) {
            return;
        }
        const node = nodes.find((item) => item.selected && !isMarker(item.id));
        if (node) {
            onChange(removeNode(document, node.id));
            return;
        }
        const edge = edges.find((item) => item.selected);
        const data = edge?.data as FlowEdgeData | undefined;
        if (data?.removable) {
            onChange(disconnectEdge(document, data));
        }
    }

    const canRemove = nodes.some((node) => node.selected && !isMarker(node.id))
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
                        void instance.fitView({ padding: 0.2, maxZoom: 1 });
                    }}
                    minZoom={0.35}
                    nodesConnectable={!locked}
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
                        if (!isMarker(node.id)) {
                            onOpenNode?.(node.id);
                        }
                        if (!picking || !onPick || isMarker(node.id)) {
                            return;
                        }
                        onPick(node.id);
                    }}
                    onEdgeClick={() => {
                        setNodes((current) => current.map((node) => ({ ...node, selected: false })));
                    }}
                >
                    <CanvasTools
                        arrangeToken={arrangeToken}
                        canRemove={canRemove && !locked}
                        promptOpen={promptOpen}
                        onArrange={arrange}
                        onRemove={removeSelected}
                        onPrompt={() => onOpenPrompt?.()}
                        onAdd={addStep}
                    />
                    {onFocus ? <SendToChat nodes={nodes} edges={edges} onFocus={onFocus} /> : null}
                    <Background />
                    <Controls showInteractive={false} />
                </ReactFlow>
            </GraphActionsProvider>
        </div>
    );
}

function edgeById(edges: Edge[], id: string): FlowEdgeData | undefined {
    return edges.find((edge) => edge.id === id)?.data as FlowEdgeData | undefined;
}

function SendToChat({
    nodes,
    edges,
    onFocus,
}: {
    nodes: Node[];
    edges: Edge[];
    onFocus: (chips: FocusChip[]) => void;
}) {
    const selectedNodes = nodes.filter((node) => node.selected && !isMarker(node.id));
    const selectedEdges = edges.filter((edge) => edge.selected && (edge.data as FlowEdgeData | undefined)?.functionName);
    if (selectedNodes.length === 0 && selectedEdges.length === 0) {
        return null;
    }
    const bounds = selectedNodes.length > 0 ? getNodesBounds(selectedNodes) : { x: 40, y: 40, width: 0, height: 0 };
    const chips: FocusChip[] = [
        ...selectedNodes.map((node) => ({ kind: "node" as const, label: node.id })),
        ...selectedEdges.flatMap((edge) => {
            const label = (edge.data as FlowEdgeData | undefined)?.functionName;
            return label ? [{ kind: "edge" as const, label }] : [];
        }),
    ];
    return (
        <SendToChatButton left={bounds.x} top={bounds.y} onClick={() => onFocus(chips)} />
    );
}

function SendToChatButton({ left, top, onClick }: { left: number; top: number; onClick: () => void }) {
    const { x, y, zoom } = useViewport();
    return (
        <Panel
            position="top-left"
            className="send-to-chat nopan nodrag"
            style={{ left: left * zoom + x, top: top * zoom + y, margin: 0 }}
        >
            <button
                type="button"
                className="pill nopan nodrag"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                    event.stopPropagation();
                    onClick();
                }}
            >
                Send to chat
            </button>
        </Panel>
    );
}
