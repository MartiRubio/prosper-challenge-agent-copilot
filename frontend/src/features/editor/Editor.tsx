import { AgentList } from "../agent-list/AgentList";
import { useOpenAgent } from "./useOpenAgent";

export function Editor() {
    const { agents, agentId, document, loading, error, openAgent } = useOpenAgent();

    return (
        <div className="editor">
            <AgentList agents={agents} selectedId={agentId} onSelect={openAgent} />
            <main className="editor-stage">
                {loading && <p className="muted">Loading agent…</p>}
                {error && <p className="error">{error}</p>}
                {document && (
                    <section>
                        <h1>{document.name}</h1>
                        {document.persona && <p className="persona">{document.persona}</p>}
                        <h2>Nodes</h2>
                        <ul className="node-names">
                            {document.nodes.map((node) => (
                                <li key={node.name}>{node.name}</li>
                            ))}
                        </ul>
                    </section>
                )}
            </main>
        </div>
    );
}
