import { AgentList } from "../agent-list/AgentList";
import { AgentCanvas } from "../agent-graph/AgentCanvas";
import { NodeInspector } from "../node-inspector/NodeInspector";
import { setNodePositions } from "../graph-edits/setNodePositions";
import { useOpenAgent } from "./useOpenAgent";

export function Editor() {
    const {
        agents,
        agentId,
        document,
        selectedNodeName,
        loading,
        saving,
        dirty,
        error,
        openAgent,
        save,
        selectNode,
        editDocument,
    } = useOpenAgent();

    return (
        <div className="editor">
            <AgentList agents={agents} selectedId={agentId} loading={loading} onSelect={openAgent} />
            <main className="editor-stage">
                {loading && <p className="muted">Loading agent…</p>}
                {error && <p className="error">{error}</p>}
                {document && (
                    <section className="agent-view">
                        <header className="stage-heading">
                            <div>
                                <h1>{document.name}</h1>
                                {document.persona && <p className="persona">{document.persona}</p>}
                            </div>
                            <button
                                type="button"
                                className="save-button"
                                onClick={() => void save()}
                                disabled={!dirty || saving}
                            >
                                {saving ? "Saving…" : "Save"}
                            </button>
                        </header>
                        <AgentCanvas
                            key={agentId ?? document.name}
                            document={document}
                            selectedNodeName={selectedNodeName}
                            onSelectNode={selectNode}
                            onMoveNodes={(moves) => editDocument(setNodePositions(document, moves))}
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
