import { useEffect, useRef, useState } from "react";
import { Bot, Braces, Save, ScrollText } from "lucide-react";

import { AgentList } from "../agent-list/AgentList";
import { AgentCanvas } from "../agent-graph/AgentCanvas";
import { FunctionEditor } from "../function-catalog/FunctionEditor";
import { FunctionList } from "../function-catalog/FunctionList";
import type { FunctionTemplate } from "../function-catalog/functionTemplate";
import { useFunctions } from "../function-catalog/useFunctions";
import { PromptEditor } from "../prompt-editor/PromptEditor";
import { useCallChannel } from "../test-call/callChannel";
import { TestCall } from "../test-call/TestCall";
import { TestDataDialog } from "../test-call/TestDataDialog";
import { testDataReady, testFields } from "../test-call/testFields";
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
    const [promptOpen, setPromptOpen] = useState(false);
    const [testDataOpen, setTestDataOpen] = useState(false);
    const [testData, setTestData] = useState<Record<string, string>>({});
    const [picking, setPicking] = useState(false);
    const startFromNode = useRef<(nodeName: string) => void>(() => {});
    const fields = document ? testFields(document, catalog.functions) : [];
    const ready = testDataReady(fields, testData);
    const selectedFunction = catalog.functions.find((fn) => fn.name === functionName) ?? null;

    useEffect(() => {
        setTestData({});
        setPicking(false);
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
                            <div className="stage-actions">
                                <button type="button" className="pill" onClick={() => setPromptOpen(true)}>
                                    <ScrollText className="nav-icon icon-prompt" aria-hidden="true" />
                                    Prompt
                                </button>
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
                            <div className="stage-actions stage-end">
                                <button
                                    type="button"
                                    className="pill save-button"
                                    onClick={() => void save()}
                                    disabled={!dirty || saving}
                                >
                                    <Save className="nav-icon" aria-hidden="true" />
                                    {saving ? "Saving…" : "Save"}
                                </button>
                            </div>
                        </header>
                        <AgentCanvas
                            key={agentId ?? document.name}
                            document={document}
                            functions={catalog.functions}
                            activeNodeName={activeNode}
                            onChange={editDocument}
                            picking={picking && !callLive}
                            onPick={(nodeName) => startFromNode.current(nodeName)}
                        />
                    </section>
                )}
                {menu === "functions" && (
                    <FunctionEditor fn={selectedFunction} onChange={replaceFunction} />
                )}
            </main>
            {promptOpen && document && (
                <PromptEditor
                    title="Prompt"
                    label="Prompt"
                    value={document.persona ?? ""}
                    model={document.model ?? "gpt-4o"}
                    onChange={setPersona}
                    onClose={() => setPromptOpen(false)}
                />
            )}
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
