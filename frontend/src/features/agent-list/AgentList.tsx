import type { AgentSummary } from "../editor/agentDocument";

type AgentListProps = {
    agents: AgentSummary[];
    selectedId: string | null;
    onSelect: (agentId: string) => void;
};

export function AgentList({ agents, selectedId, onSelect }: AgentListProps) {
    return (
        <aside className="agent-list">
            <p className="eyebrow">Agents</p>
            {agents.length === 0 ? (
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
