import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import type { AgentSummary } from "../editor/agentDocument";

type AgentListProps = {
    agents: AgentSummary[];
    selectedId: string | null;
    loading: boolean;
    onSelect: (agentId: string) => void;
    onCreate: () => void;
    onRename: (name: string) => void;
    onDelete: (agentId: string) => void;
};

export function AgentList({ agents, selectedId, loading, onSelect, onCreate, onRename, onDelete }: AgentListProps) {
    const [editing, setEditing] = useState(false);
    useEffect(() => {
        setEditing(false);
    }, [selectedId]);
    return (
        <div className="nav-list">
            <div className="inspector-row">
                <p className="eyebrow">Agents</p>
                <button type="button" className="pill" onClick={onCreate}>
                    <Plus className="nav-icon icon-add" aria-hidden="true" />
                    New
                </button>
            </div>
            {!loading && agents.length === 0 ? (
                <p className="muted">No agents yet.</p>
            ) : (
                <ul>
                    {agents.map((agent) => (
                        <li key={agent.id} className="nav-row">
                            {agent.id === selectedId ? (
                                <AgentName
                                    name={agent.name}
                                    editing={editing}
                                    onRename={onRename}
                                    onDone={() => setEditing(false)}
                                />
                            ) : (
                                <button type="button" className="pill agent-pill" onClick={() => onSelect(agent.id)}>
                                    {agent.name}
                                </button>
                            )}
                            {agent.id === selectedId ? (
                                <button
                                    type="button"
                                    className="icon-button is-edit"
                                    aria-label={`Rename ${agent.name}`}
                                    onClick={() => setEditing(true)}
                                >
                                    <Pencil className="nav-icon" aria-hidden="true" />
                                </button>
                            ) : null}
                            <button
                                type="button"
                                className="icon-button"
                                aria-label={`Delete ${agent.name}`}
                                onClick={() => onDelete(agent.id)}
                            >
                                <Trash2 className="nav-icon" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function AgentName({
    name,
    editing,
    onRename,
    onDone,
}: {
    name: string;
    editing: boolean;
    onRename: (name: string) => void;
    onDone: () => void;
}) {
    const [draft, setDraft] = useState(name);
    const [tracked, setTracked] = useState(name);
    const skip = useRef(false);
    if (name !== tracked) {
        setTracked(name);
        setDraft(name);
    }
    if (!editing) {
        return <span className="pill agent-name is-quiet">{name}</span>;
    }
    return (
        <input
            className="pill-input agent-name"
            aria-label="Agent name"
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    skip.current = true;
                    setDraft(name);
                    onDone();
                }
                if (event.key === "Enter") {
                    event.currentTarget.blur();
                }
            }}
            onBlur={() => {
                onDone();
                if (skip.current) {
                    skip.current = false;
                    setDraft(name);
                    return;
                }
                const trimmed = draft.trim();
                onRename(trimmed);
                setDraft(trimmed || name);
            }}
        />
    );
}
