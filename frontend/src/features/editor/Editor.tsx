import { AgentList } from "../agent-list/AgentList";
import { AgentCanvas } from "../agent-graph/AgentCanvas";
import { useActiveNode } from "../agent-graph/useActiveNode";
import { NodeInspector } from "../node-inspector/NodeInspector";
import { setNodePositions } from "../graph-edits/setNodePositions";
import { TestCall } from "../test-call/TestCall";
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
        createNewAgent,
        save,
        selectNode,
        editDocument,
    } = useOpenAgent();
    const activeNodeName = useActiveNode(agentId);

    return (
        <div className="editor">
            <AgentList
                agents={agents}
                selectedId={agentId}
                loading={loading}
                onSelect={openAgent}
                onCreate={() => void createNewAgent()}
            />
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
                            <div className="stage-actions">
                                <TestCall agentId={agentId} disabled={dirty} />
                                <button
                                    type="button"
                                    className="save-button"
                                    onClick={() => void save()}
                                    disabled={!dirty || saving}
                                >
                                    {saving ? "Saving…" : "Save"}
                                </button>
                            </div>
                        </header>
                        <AgentCanvas
                            key={agentId ?? document.name}
                            document={document}
                            selectedNodeName={selectedNodeName}
                            activeNodeName={activeNodeName}
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
