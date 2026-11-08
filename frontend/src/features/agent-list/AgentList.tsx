import type { AgentSummary } from "../editor/agentDocument";

type AgentListProps = {
    agents: AgentSummary[];
    selectedId: string | null;
    loading: boolean;
    onSelect: (agentId: string) => void;
    onCreate: () => void;
};

export function AgentList({ agents, selectedId, loading, onSelect, onCreate }: AgentListProps) {
    return (
        <aside className="agent-list">
            <div className="inspector-row">
                <p className="eyebrow">Agents</p>
                <button type="button" onClick={onCreate}>
                    New
                </button>
            </div>
            {!loading && agents.length === 0 ? (
                <p className="muted">No agents yet.</p>
            ) : (
                <ul>
                    {agents.map((agent) => (
                        <li key={agent.id}>
                            <button
                                type="button"
                                aria-current={agent.id === selectedId}
                                onClick={() => onSelect(agent.id)}
                            >
                                {agent.name}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </aside>
    );
}
