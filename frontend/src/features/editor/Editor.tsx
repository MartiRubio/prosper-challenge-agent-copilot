import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Braces, MessagesSquare, Save } from "lucide-react";

import { renameFunction } from "../../api/functions";
import { AgentList } from "../agent-list/AgentList";
import { AgentCanvas } from "../agent-graph/AgentCanvas";
import { BrandMark } from "../brand/BrandMark";
import { CallLog } from "../call-log/CallLog";
import { useCallLog } from "../call-log/useCallLog";
import { CopilotChat } from "../copilot/CopilotChat";
import { previewDocument, previewFunctions } from "../copilot/review";
import { useCopilot } from "../copilot/useCopilot";
import { FunctionEditor } from "../function-catalog/FunctionEditor";
import { FunctionList } from "../function-catalog/FunctionList";
import type { FunctionTemplate } from "../function-catalog/functionTemplate";
import { useFunctions } from "../function-catalog/useFunctions";
import { renameFunctionEdges } from "../graph-edits/editEdge";
import { uniqueName } from "../graph-edits/uniqueName";
import { formatTime, HistoryMenu } from "../history/HistoryMenu";
import { useCallChannel } from "../test-call/callChannel";
import { TestCall } from "../test-call/TestCall";
import { TestDataDialog } from "../test-call/TestDataDialog";
import { testDataReady, testFields } from "../test-call/testFields";
import { NodePanel } from "./NodePanel";
import { StartAgent } from "./StartAgent";
import { useOpenAgent } from "./useOpenAgent";

const FUNCTION_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const IMPROVE_REQUEST = "Improve the agent using these flagged calls and the feedback on each one.";

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
        restoreVersion,
        restoredFrom,
        saveCount,
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
    const [openCallId, setOpenCallId] = useState<string | null>(null);
    const [manualAgents, setManualAgents] = useState<string[]>([]);
    const [openNode, setOpenNode] = useState<string | null>(null);
    const [renameCarry, setRenameCarry] = useState<{ from: string; to: string } | null>(null);
    const startFromNode = useRef<(nodeName: string) => void>(() => {});
    const copilot = useCopilot({
        agentId,
        document,
        functions: catalog.functions,
        replaceFunctions: catalog.stage,
        editDocument,
    });
    const callLog = useCallLog(agentId, callLive);
    const previewed = useMemo(
        () => (document && copilot.locked ? previewDocument(document, copilot.pending, catalog.functions) : document),
        [document, copilot.locked, copilot.pending, catalog.functions],
    );
    const previewedFunctions = useMemo(
        () => (copilot.locked ? previewFunctions(catalog.functions, copilot.pending) : catalog.functions),
        [catalog.functions, copilot.locked, copilot.pending],
    );
    const fields = document ? testFields(document, catalog.functions) : [];
    const ready = testDataReady(fields, testData);
    const selectedFunction = catalog.functions.find((fn) => fn.name === functionName) ?? null;

    useEffect(() => {
        setTestData({});
        setPicking(false);
        setCallLogOpen(false);
        setOpenCallId(null);
        setOpenNode(null);
        setRenameCarry(null);
        setShowPersona(false);
    }, [agentId]);

    const saveAll = useCallback(async () => {
        try {
            await catalog.flush();
        } catch {
            return;
        }
        await save();
    }, [catalog, save]);

    useEffect(() => {
        catalog.discardStaged();
        // Only when the open agent changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [agentId]);

    useEffect(() => {
        function onKey(event: KeyboardEvent) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                if (dirty && !saving && !copilot.locked) {
                    void saveAll();
                }
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [dirty, saving, saveAll, copilot.locked]);

    // A click anywhere outside the step editor closes it; a click on another step switches to it.
    useEffect(() => {
        if (!openNode && !showPersona) {
            return;
        }
        function onPointer(event: PointerEvent) {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }
            if (target.closest(".floating-panel, .react-flow__node, .canvas-tools, .prompt-backdrop")) {
                return;
            }
            setOpenNode(null);
            setShowPersona(false);
        }
        window.addEventListener("pointerdown", onPointer);
        return () => window.removeEventListener("pointerdown", onPointer);
    }, [openNode, showPersona]);

    const openCall = useCallback((callId: string) => {
        setCallLogOpen(true);
        setOpenCallId(callId);
    }, []);
    const closeCallLog = useCallback(() => setCallLogOpen(false), []);

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
        const name = uniqueName("new_function", catalog.functions.map((fn) => fn.name));
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

    const pendingCount = copilot.pending.length;
    const showStart = Boolean(
        document && agentId && document.nodes.length === 0 && copilot.requests.length === 0 && !manualAgents.includes(agentId),
    );

    return (
        <div className="editor">
            <aside className="sidebar">
                <div className="brand">
                    <BrandMark />
                    <span>Agent Studio</span>
                </div>
                <div className="segmented" role="tablist">
                    <button type="button" role="tab" aria-selected={menu === "agents"} onClick={() => setMenu("agents")}>
                        <Bot aria-hidden="true" />
                        Agents
                    </button>
                    <button type="button" role="tab" aria-selected={menu === "functions"} onClick={() => setMenu("functions")}>
                        <Braces aria-hidden="true" />
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
            <main className="stage">
                {(error || catalog.error) && (
                    <p className="toast-error" role="alert">
                        {error ?? catalog.error}
                        <button type="button" className="link" onClick={() => setError(null)}>Dismiss</button>
                    </p>
                )}
                {!document && !loading && menu === "agents" ? (
                    <div className="stage-empty">
                        <h2>No agent open</h2>
                        <p className="muted">Create one with New, then ask the copilot to draft it from the client&apos;s guidelines.</p>
                    </div>
                ) : null}
                {document && (
                    <section className={menu === "agents" ? "agent-view" : "agent-view is-hidden"}>
                        <header className="topbar">
                            <div className="topbar-title">
                                <h1>{document.name}</h1>
                                <span className={dirty ? "save-state is-dirty" : "save-state"}>
                                    {saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}
                                </span>
                            </div>
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
                            <div className="topbar-actions">
                                <button
                                    type="button"
                                    className="btn"
                                    aria-pressed={callLogOpen}
                                    onClick={() => setCallLogOpen((open) => !open)}
                                >
                                    <MessagesSquare aria-hidden="true" />
                                    Call log
                                    {callLog.checking.length > 0 ? (
                                        <span className="count is-busy" title="Checking calls">…</span>
                                    ) : callLog.issues > 0 ? (
                                        <span className="count is-issue" title={`${callLog.issues} calls with issues`}>{callLog.issues}</span>
                                    ) : null}
                                </button>
                                {agentId ? <HistoryMenu agentId={agentId} saveCount={saveCount} onRestore={(id, at) => void restoreVersion(id, at)} /> : null}
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => void saveAll()}
                                    disabled={!dirty || saving || document.nodes.length === 0 || copilot.locked}
                                    title={copilot.locked ? "Keep or discard the copilot's changes first" : "Save (⌘S)"}
                                >
                                    <Save aria-hidden="true" />
                                    {saving ? "Saving…" : "Save"}
                                </button>
                            </div>
                        </header>
                        {restoredFrom ? (
                            <p className="banner banner-info">
                                Restored the version saved {formatTime(restoredFrom)}. Save to make it the current agent.
                            </p>
                        ) : null}
                        <div className="workspace">
                            <div className="canvas-area">
                                <AgentCanvas
                                    key={agentId ?? document.name}
                                    document={previewed ?? document}
                                    functions={previewedFunctions}
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
                                {showStart ? (
                                    <StartAgent
                                        attachments={copilot.attachments}
                                        reading={copilot.reading}
                                        attachError={copilot.attachError}
                                        onAttach={(files) => void copilot.attach(files)}
                                        onDetach={copilot.detach}
                                        onDraft={(prompt) => void copilot.send(prompt)}
                                        onManual={() => agentId && setManualAgents((current) => [...current, agentId])}
                                    />
                                ) : null}
                                {copilot.locked ? (
                                    <p className="review-banner" role="status">
                                        Reviewing {pendingCount} proposed {pendingCount === 1 ? "change" : "changes"}. Keep or discard them to edit the graph again.
                                    </p>
                                ) : null}
                                {(openNode || showPersona) && !callLogOpen ? (
                                    <div className="floating-panel">
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
                                            onClose={() => {
                                                setOpenNode(null);
                                                setShowPersona(false);
                                            }}
                                        />
                                    </div>
                                ) : null}
                                {callLogOpen ? (
                                    <div className="drawer">
                                        <CallLog
                                            log={callLog}
                                            sending={copilot.sending}
                                            openCallId={openCallId}
                                            onOpenCall={setOpenCallId}
                                            onClose={closeCallLog}
                                            onFocusStep={(step) => copilot.addFocus([{ kind: "node", label: step }])}
                                            onSimulate={(count) => {
                                                if (!document) {
                                                    return;
                                                }
                                                void callLog.simulate(document, catalog.functions, count).then((first) => {
                                                    if (first) {
                                                        setOpenCallId(first);
                                                    }
                                                });
                                            }}
                                            onImprove={() => {
                                                setCallLogOpen(false);
                                                void copilot.send(IMPROVE_REQUEST, callLog.flagged.filter((call) => call.feedback.trim()));
                                            }}
                                        />
                                    </div>
                                ) : null}
                            </div>
                            <CopilotChat
                                document={document}
                                focus={copilot.focus}
                                attachments={copilot.attachments}
                                reading={copilot.reading}
                                attachError={copilot.attachError}
                                requests={copilot.requests}
                                index={copilot.index}
                                sending={copilot.sending}
                                applying={copilot.applying}
                                onIndex={copilot.setIndex}
                                onRemoveFocus={copilot.removeFocus}
                                onAttach={(files) => void copilot.attach(files)}
                                onDetach={copilot.detach}
                                onSend={(message) => void copilot.send(message)}
                                onKeep={(ids) => void copilot.keep(ids)}
                                onDiscard={copilot.discard}
                                onHover={copilot.hover}
                                onReplay={(id) => void copilot.replay(id)}
                                onSendFailures={copilot.sendReplayFailures}
                                onOpenCall={openCall}
                            />
                        </div>
                    </section>
                )}
                {menu === "functions" && (
                    <FunctionEditor fn={selectedFunction} onChange={replaceFunction} />
                )}
            </main>
            {testDataOpen && (
                <TestDataDialog
                    agent={document ?? { name: "", initial_node: "", nodes: [] }}
                    fields={fields}
                    values={testData}
                    onChange={(name, value) => setTestData((current) => ({ ...current, [name]: value }))}
                    onClose={() => setTestDataOpen(false)}
                />
            )}
        </div>
    );
}
