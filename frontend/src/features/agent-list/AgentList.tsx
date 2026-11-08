import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

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
                                <AgentName name={agent.name} onRename={onRename} />
                            ) : (
                                <button type="button" className="pill agent-pill" onClick={() => onSelect(agent.id)}>
                                    {agent.name}
                                </button>
                            )}
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

function AgentName({ name, onRename }: { name: string; onRename: (name: string) => void }) {
    const [draft, setDraft] = useState(name);
    const focused = useRef(false);
    useEffect(() => {
        if (!focused.current) {
            setDraft(name);
        }
    }, [name]);
    return (
        <input
            className="pill-input agent-name"
            aria-label="Agent name"
            value={draft}
            onFocus={() => {
                focused.current = true;
            }}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
                focused.current = false;
                const trimmed = draft.trim();
                onRename(trimmed);
                setDraft(trimmed || name);
            }}
        />
    );
}
