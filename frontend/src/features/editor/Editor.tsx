import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Braces, MessagesSquare, Save } from "lucide-react";

import { renameFunction } from "../../api/functions";
import { AgentList } from "../agent-list/AgentList";
import { AgentCanvas } from "../agent-graph/AgentCanvas";
import { CallLog } from "../copilot/CallLog";
import { CopilotChat } from "../copilot/CopilotChat";
import { previewDocument, previewFunctions } from "../copilot/review";
import { useCopilot } from "../copilot/useCopilot";
import { FunctionEditor } from "../function-catalog/FunctionEditor";
import { FunctionList } from "../function-catalog/FunctionList";
import type { FunctionTemplate } from "../function-catalog/functionTemplate";
import { useFunctions } from "../function-catalog/useFunctions";
import { useCallChannel } from "../test-call/callChannel";
import { TestCall } from "../test-call/TestCall";
import { TestDataDialog } from "../test-call/TestDataDialog";
import { testDataReady, testFields } from "../test-call/testFields";
import { renameFunctionEdges } from "../graph-edits/editEdge";
import { NodePanel } from "./NodePanel";
import { useOpenAgent } from "./useOpenAgent";

const FUNCTION_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export function Editor() {
    const {
        agents,
        agentId,
        document,
        loading,
        saving,
        dirty,
        error,
        setError,
        openAgent,
        createNewAgent,
        removeAgent,
        save,
        editDocument,
        renameOpenAgent,
        setPersona,
    } = useOpenAgent();
    const catalog = useFunctions();
    const { activeNode, callLive } = useCallChannel();
    const [menu, setMenu] = useState<"agents" | "functions">("agents");
    const [functionName, setFunctionName] = useState<string | null>(null);
    const [showPersona, setShowPersona] = useState(false);
    const [testDataOpen, setTestDataOpen] = useState(false);
    const [testData, setTestData] = useState<Record<string, string>>({});
    const [picking, setPicking] = useState(false);
    const [callLogOpen, setCallLogOpen] = useState(false);
    const [openNode, setOpenNode] = useState<string | null>(null);
    const [renameCarry, setRenameCarry] = useState<{ from: string; to: string } | null>(null);
    const startFromNode = useRef<(nodeName: string) => void>(() => {});
    const copilot = useCopilot({
        agentId,
        document,
        functions: catalog.functions,
        replaceFunctions: catalog.update,
        editDocument,
    });
    const shown = useMemo(
        () => (document && copilot.changes ? previewDocument(document, copilot.changes, catalog.functions) : document),
        [document, copilot.changes, catalog.functions],
    );
    const shownFunctions = useMemo(
        () => (copilot.changes ? previewFunctions(catalog.functions, copilot.changes) : catalog.functions),
        [catalog.functions, copilot.changes],
    );
    const fields = document ? testFields(document, catalog.functions) : [];
    const ready = testDataReady(fields, testData);
    const selectedFunction = catalog.functions.find((fn) => fn.name === functionName) ?? null;

    useEffect(() => {
        setTestData({});
        setPicking(false);
        setCallLogOpen(false);
        setOpenNode(null);
        setRenameCarry(null);
        setShowPersona(false);
    }, [agentId]);

    function replaceFunction(previousName: string, next: FunctionTemplate): boolean {
        if (!FUNCTION_NAME.test(next.name)) {
            return false;
        }
        if (next.name !== previousName && catalog.functions.some((fn) => fn.name === next.name)) {
            return false;
        }
        catalog.update(catalog.functions.map((fn) => (fn.name === previousName ? next : fn)));
        if (next.name !== previousName) {
            setFunctionName(next.name);
            if (document) {
                const renamed = renameFunctionEdges(document, previousName, next);
                if (renamed !== document) {
                    editDocument(renamed);
                }
            }
            void renameFunction(previousName, next.name, agentId).catch((caught: unknown) => {
                setError(caught instanceof Error ? caught.message : "Could not rename that function on the other agents.");
            });
        }
        return true;
    }

    function createFunction() {
        const name = freshName(catalog.functions.map((fn) => fn.name));
        catalog.update([
            ...catalog.functions,
            { name, description: "", properties: {}, required: [] },
        ]);
        setFunctionName(name);
    }

    function deleteFunction(name: string) {
        catalog.update(catalog.functions.filter((fn) => fn.name !== name));
        if (functionName === name) {
            setFunctionName(null);
        }
    }

    return (
        <div className="editor">
            <aside className="agent-list">
                <div className="menu-switch">
                    <button type="button" className="pill" aria-pressed={menu === "agents"} onClick={() => setMenu("agents")}>
                        <Bot className="nav-icon icon-agents" aria-hidden="true" />
                        Agents
                    </button>
                    <button type="button" className="pill" aria-pressed={menu === "functions"} onClick={() => setMenu("functions")}>
                        <Braces className="nav-icon icon-functions" aria-hidden="true" />
                        Functions
                    </button>
                </div>
                {menu === "agents" ? (
                    <AgentList
                        agents={agents}
                        selectedId={agentId}
                        loading={loading}
                        onSelect={openAgent}
                        onCreate={() => void createNewAgent()}
                        onRename={renameOpenAgent}
                        onDelete={(id) => void removeAgent(id)}
                    />
                ) : (
                    <FunctionList
                        functions={catalog.functions}
                        selected={functionName}
                        onSelect={setFunctionName}
                        onCreate={createFunction}
                        onDelete={deleteFunction}
                    />
                )}
            </aside>
            <main className="editor-stage">
                {(error || catalog.error) && <p className="error">{error ?? catalog.error}</p>}
                {document && (
                    <section className={menu === "agents" ? "agent-view" : "agent-view is-hidden"}>
                        <header className="stage-heading">
                            <div className="stage-actions" />
                            <TestCall
                                agentId={agentId}
                                agent={document}
                                fields={fields}
                                values={testData}
                                ready={ready}
                                onValue={(name, value) => setTestData((current) => ({ ...current, [name]: value }))}
                                onOpenTestData={() => setTestDataOpen(true)}
                                picking={picking}
                                onPicking={setPicking}
                                startFromNode={startFromNode}
                            />
                            <div className="stage-actions stage-end">
                                <button
                                    type="button"
                                    className="pill"
                                    aria-pressed={callLogOpen}
                                    onClick={() => setCallLogOpen((open) => !open)}
                                >
                                    <MessagesSquare className="nav-icon" aria-hidden="true" />
                                    Call log
                                </button>
                                <button
                                    type="button"
                                    className="pill save-button"
                                    onClick={() => void save()}
                                    disabled={!dirty || saving || document.nodes.length === 0}
                                >
                                    <Save className="nav-icon" aria-hidden="true" />
                                    {saving ? "Saving…" : "Save"}
                                </button>
                            </div>
                        </header>
                        <div className={callLogOpen ? "flow-workspace is-log" : "flow-workspace"}>
                            {callLogOpen && agentId ? (
                                <CallLog
                                    agentId={agentId}
                                    callLive={callLive}
                                    sending={copilot.sending}
                                    onImprove={(calls) => {
                                        setCallLogOpen(false);
                                        void copilot.send(
                                            "Improve the agent using these flagged calls and the feedback on each one.",
                                            calls,
                                        );
                                    }}
                                />
                            ) : (
                                <AgentCanvas
                                    key={agentId ?? document.name}
                                    document={shown ?? document}
                                    functions={shownFunctions}
                                    activeNodeName={activeNode}
                                    onChange={copilot.locked ? () => undefined : editDocument}
                                    picking={picking && !callLive && !copilot.locked}
                                    onPick={(nodeName) => startFromNode.current(nodeName)}
                                    review={copilot.marks}
                                    locked={copilot.locked}
                                    onFocus={copilot.addFocus}
                                    renameCarry={renameCarry}
                                    onOpenNode={(name) => {
                                        setShowPersona(false);
                                        setOpenNode(name);
                                    }}
                                    promptOpen={showPersona}
                                    onOpenPrompt={() => setShowPersona((open) => !open)}
                                />
                            )}
                            {!callLogOpen && (
                                <div className="side-stack">
                                    <NodePanel
                                        document={document}
                                        nodeName={openNode}
                                        showPersona={showPersona}
                                        locked={copilot.locked}
                                        onRenamed={(name) => {
                                            if (openNode) {
                                                setRenameCarry({ from: openNode, to: name });
                                            }
                                            setOpenNode(name);
                                        }}
                                        onChange={editDocument}
                                        onPersona={setPersona}
                                    />
                                    <CopilotChat
                                        document={document}
                                        focus={copilot.focus}
                                        turns={copilot.turns}
                                        index={copilot.index}
                                        canAdvance={copilot.canAdvance}
                                        sending={copilot.sending}
                                        applying={copilot.applying}
                                        error={copilot.error}
                                        onRetreat={copilot.retreat}
                                        onAdvance={copilot.advance}
                                        onRemoveFocus={copilot.removeFocus}
                                        onSend={(message) => void copilot.send(message)}
                                        onKeep={(ids) => void copilot.keep(ids)}
                                        onDiscard={copilot.discard}
                                        onHover={copilot.hover}
                                    />
                                </div>
                            )}
                        </div>
                    </section>
                )}
                {menu === "functions" && (
                    <FunctionEditor fn={selectedFunction} onChange={replaceFunction} />
                )}
            </main>
            {testDataOpen && (
                <TestDataDialog
                    fields={fields}
                    values={testData}
                    onChange={(name, value) => setTestData((current) => ({ ...current, [name]: value }))}
                    onClose={() => setTestDataOpen(false)}
                />
            )}
        </div>
    );
}

function freshName(used: string[]): string {
    const base = "new_function";
    if (!used.includes(base)) {
        return base;
    }
    let index = 2;
    while (used.includes(`${base}_${index}`)) {
        index += 1;
    }
    return `${base}_${index}`;
}
