import { useEffect, useState } from "react";

import type { AgentDocument } from "../editor/agentDocument";
import { addNode, removeNode, renameNode, setTaskContent } from "../graph-edits/updateNode";
import { EdgeList } from "./EdgeList";
import { TaskEditor } from "./TaskEditor";

type NodeInspectorProps = {
    document: AgentDocument;
    nodeName: string | null;
    onChange: (document: AgentDocument) => void;
    onSelectNode: (nodeName: string | null) => void;
};

export function NodeInspector({ document, nodeName, onChange, onSelectNode }: NodeInspectorProps) {
    const node = document.nodes.find((item) => item.name === nodeName);

    function addAndSelect() {
        const next = addNode(document);
        onChange(next);
        onSelectNode(next.nodes[next.nodes.length - 1]?.name ?? null);
    }

    function removeAndSelect() {
        if (!node) {
            return;
        }
        const next = removeNode(document, node.name);
        onChange(next);
        onSelectNode(next.nodes.some((item) => item.name === node.name) ? node.name : next.initial_node);
    }

    return (
        <aside className="inspector">
            <div className="inspector-row">
                <p className="eyebrow">Node</p>
                <button type="button" onClick={addAndSelect}>
                    Add node
                </button>
            </div>
            {!node && <p className="muted">Select a node on the graph.</p>}
            {node && (
                <>
                    <NodeName
                        name={node.name}
                        onRename={(name) => {
                            const next = renameNode(document, node.name, name);
                            onChange(next);
                            const renamed = next.nodes.find((item) => item.name === name.trim());
                            if (renamed) {
                                onSelectNode(renamed.name);
                            }
                        }}
                    />
                    <TaskEditor
                        content={node.task_messages?.[0]?.content ?? ""}
                        onChange={(content) => onChange(setTaskContent(document, node.name, content))}
                    />
                    <EdgeList document={document} nodeName={node.name} onChange={onChange} />
                    <button type="button" onClick={removeAndSelect}>
                        Remove node
                    </button>
                </>
            )}
        </aside>
    );
}

function NodeName({ name, onRename }: { name: string; onRename: (name: string) => void }) {
    const [draft, setDraft] = useState(name);
    useEffect(() => {
        setDraft(name);
    }, [name]);
    return (
        <label className="field">
            Name
            <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => {
                    onRename(draft);
                    setDraft(name);
                }}
            />
        </label>
    );
}
