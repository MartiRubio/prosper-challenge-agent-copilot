import { AgentList } from "../agent-list/AgentList";
import { AgentCanvas } from "../agent-graph/AgentCanvas";
import { NodeInspector } from "../node-inspector/NodeInspector";
import { useOpenAgent } from "./useOpenAgent";

export function Editor() {
    const {
        agents,
        agentId,
        document,
        selectedNodeName,
        loading,
        error,
        openAgent,
        selectNode,
        editDocument,
    } = useOpenAgent();

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
                        <AgentCanvas
                            key={agentId ?? document.name}
                            document={document}
                            selectedNodeName={selectedNodeName}
                            onSelectNode={selectNode}
                        />
                    </section>
                )}
            </main>
            {document && (
                <NodeInspector
                    document={document}
                    nodeName={selectedNodeName}
                    onChange={editDocument}
                    onSelectNode={selectNode}
                />
            )}
        </div>
    );
}
