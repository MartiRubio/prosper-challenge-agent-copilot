import { AgentList } from "../agent-list/AgentList";
import { AgentCanvas } from "../agent-graph/AgentCanvas";
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
                    <section className="agent-view">
                        <header>
                            <h1>{document.name}</h1>
                            {document.persona && <p className="persona">{document.persona}</p>}
                        </header>
                        <AgentCanvas key={agentId ?? document.name} document={document} />
                    </section>
                )}
            </main>
        </div>
    );
}
