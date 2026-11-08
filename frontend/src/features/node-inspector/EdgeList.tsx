import { useEffect, useState } from "react";

import type { AgentDocument, AgentEdge } from "../editor/agentDocument";
import {
    addCollectedField,
    addEdge,
    removeCollectedField,
    removeEdge,
    renameEdgeFunction,
    setEdgeDescription,
    setEdgeTarget,
    updateCollectedField,
} from "../graph-edits/updateEdge";

type EdgeListProps = {
    document: AgentDocument;
    nodeName: string;
    onChange: (document: AgentDocument) => void;
};

export function EdgeList({ document, nodeName, onChange }: EdgeListProps) {
    const node = document.nodes.find((item) => item.name === nodeName);
    const edges = node?.edges ?? [];
    const nodeNames = document.nodes.map((item) => item.name);

    return (
        <div className="edge-list">
            <div className="inspector-row">
                <p className="eyebrow">Edges</p>
                <button type="button" onClick={() => onChange(addEdge(document, nodeName))}>
                    Add edge
                </button>
            </div>
            {edges.length === 0 && <p className="muted">This node does not leave for another step.</p>}
            {edges.map((edge) => (
                <EdgeCard
                    key={edge.function}
                    edge={edge}
                    nodeNames={nodeNames}
                    onDescription={(description) =>
                        onChange(setEdgeDescription(document, nodeName, edge.function, description))
                    }
                    onTarget={(target) =>
                        onChange(setEdgeTarget(document, nodeName, edge.function, target))
                    }
                    onRename={(nextFunction) =>
                        onChange(renameEdgeFunction(document, nodeName, edge.function, nextFunction))
                    }
                    onRemove={() => onChange(removeEdge(document, nodeName, edge.function))}
                    onAddField={() => onChange(addCollectedField(document, nodeName, edge.function))}
                    onRemoveField={(fieldName) =>
                        onChange(removeCollectedField(document, nodeName, edge.function, fieldName))
                    }
                    onUpdateField={(fieldName, patch) =>
                        onChange(updateCollectedField(document, nodeName, edge.function, fieldName, patch))
                    }
                />
            ))}
        </div>
    );
}

type EdgeCardProps = {
    edge: AgentEdge;
    nodeNames: string[];
    onDescription: (description: string) => void;
    onTarget: (target: string) => void;
    onRename: (functionName: string) => void;
    onRemove: () => void;
    onAddField: () => void;
    onRemoveField: (fieldName: string) => void;
    onUpdateField: (
        fieldName: string,
        patch: { name?: string; type?: string; description?: string; required?: boolean },
    ) => void;
};

function FieldName({ name, onRename }: { name: string; onRename: (name: string) => void }) {
    const [draft, setDraft] = useState(name);
    useEffect(() => {
        setDraft(name);
    }, [name]);
    return (
        <input
            aria-label="Field name"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
                onRename(draft);
                setDraft(name);
            }}
        />
    );
}

function EdgeCard({
    edge,
    nodeNames,
    onDescription,
    onTarget,
    onRename,
    onRemove,
    onAddField,
    onRemoveField,
    onUpdateField,
}: EdgeCardProps) {
    const [functionName, setFunctionName] = useState(edge.function);
    useEffect(() => {
        setFunctionName(edge.function);
    }, [edge.function]);
    const fields = Object.entries(edge.properties ?? {});
    const required = new Set(edge.required ?? []);

    return (
        <fieldset className="edge-card">
            <label className="field">
                Function
                <input
                    value={functionName}
                    onChange={(event) => setFunctionName(event.target.value)}
                    onBlur={() => {
                        onRename(functionName);
                        setFunctionName(edge.function);
                    }}
                />
            </label>
            <label className="field">
                When to take it
                <textarea
                    rows={3}
                    value={edge.description}
                    onChange={(event) => onDescription(event.target.value)}
                />
            </label>
            <label className="field">
                Goes to
                <select value={edge.target} onChange={(event) => onTarget(event.target.value)}>
                    {nodeNames.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
            </label>
            <div className="inspector-row">
                <p className="eyebrow">Collects</p>
                <button type="button" onClick={onAddField}>
                    Add field
                </button>
            </div>
            {fields.map(([fieldName, field]) => (
                <div className="collected-field" key={fieldName}>
                    <FieldName
                        name={fieldName}
                        onRename={(name) => onUpdateField(fieldName, { name })}
                    />
                    <input
                        aria-label="Field type"
                        value={field.type ?? "string"}
                        onChange={(event) => onUpdateField(fieldName, { type: event.target.value })}
                    />
                    <input
                        aria-label="Field description"
                        value={field.description ?? ""}
                        onChange={(event) =>
                            onUpdateField(fieldName, { description: event.target.value })
                        }
                    />
                    <label className="check">
                        <input
                            type="checkbox"
                            checked={required.has(fieldName)}
                            onChange={(event) =>
                                onUpdateField(fieldName, { required: event.target.checked })
                            }
                        />
                        Required
                    </label>
                    <button type="button" onClick={() => onRemoveField(fieldName)}>
                        Remove
                    </button>
                </div>
            ))}
            <button type="button" onClick={onRemove}>
                Remove edge
            </button>
        </fieldset>
    );
}
