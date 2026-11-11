import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";

import { rewritePersona, rewriteTask } from "../../api/copilot";
import { renameNode, setTaskContent } from "../graph-edits/updateNode";
import type { AgentDocument } from "./agentDocument";

type NodePanelProps = {
    document: AgentDocument;
    nodeName: string | null;
    showPersona: boolean;
    locked: boolean;
    onChange: (document: AgentDocument) => void;
    onRenamed: (name: string) => void;
    onPersona: (persona: string) => void;
    onClose: () => void;
};

export function NodePanel({ document, nodeName, showPersona, locked, onChange, onRenamed, onPersona, onClose }: NodePanelProps) {
    const node = document.nodes.find((item) => item.name === nodeName) ?? null;
    const [draftName, setDraftName] = useState(node?.name ?? "");
    const [trackedName, setTrackedName] = useState(node?.name);
    const [rewriteError, setRewriteError] = useState<string | null>(null);
    const [rewriting, setRewriting] = useState(false);
    const [noteOpen, setNoteOpen] = useState(false);
    const [note, setNote] = useState("");
    const noteRef = useRef<HTMLInputElement>(null);
    const task = node?.task_messages?.[0]?.content ?? "";
    if (node?.name !== trackedName) {
        setTrackedName(node?.name);
        setDraftName(node?.name ?? "");
        setNoteOpen(false);
        setNote("");
        setRewriteError(null);
    }

    useEffect(() => {
        if (noteOpen) {
            noteRef.current?.focus();
        }
    }, [noteOpen]);

    async function rewrite() {
        const message = note.trim();
        if ((!node && !showPersona) || locked || rewriting || !message) {
            return;
        }
        setNoteOpen(false);
        setRewriting(true);
        setRewriteError(null);
        try {
            if (showPersona) {
                onPersona(await rewritePersona(document, message));
            } else if (node) {
                const content = await rewriteTask(document, node.name, task, message);
                onChange(setTaskContent(document, node.name, content));
            }
            setNote("");
        } catch (caught) {
            setRewriteError(caught instanceof Error ? caught.message : "The step could not be rewritten.");
        } finally {
            setRewriting(false);
        }
    }

    const rewriteControls = (
        <>
            {noteOpen ? (
                <form
                    className="rewrite-pop"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void rewrite();
                    }}
                >
                    <input
                        ref={noteRef}
                        className="rewrite-note"
                        aria-label="Tell the LLM what to improve"
                        placeholder={showPersona ? "How should the persona change?" : "How should this step change?"}
                        value={note}
                        disabled={rewriting}
                        onChange={(event) => setNote(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                setNoteOpen(false);
                            }
                        }}
                    />
                </form>
            ) : null}
            <button
                type="button"
                className={rewriting ? "rewrite-button is-busy" : "rewrite-button"}
                aria-label={showPersona ? "Rewrite the persona with AI" : "Rewrite this step with AI"}
                aria-expanded={noteOpen}
                disabled={locked || rewriting}
                onClick={() => setNoteOpen((open) => !open)}
            >
                <Sparkles className="nav-icon" aria-hidden="true" />
            </button>
        </>
    );

    if (showPersona) {
        return (
            <section className="node-panel" aria-label="General prompt">
                <header className="panel-head">
                    <p className="eyebrow">General prompt</p>
                    <button type="button" className="ghost-icon" aria-label="Close" onClick={onClose}><X aria-hidden="true" /></button>
                </header>
                <div className="task-field">
                    <textarea
                        className="prompt-raw"
                        aria-label="General prompt"
                        value={document.persona ?? ""}
                        disabled={locked || rewriting}
                        onChange={(event) => onPersona(event.target.value)}
                    />
                    {rewriteControls}
                </div>
                {rewriteError ? <p className="error">{rewriteError}</p> : null}
            </section>
        );
    }

    if (!node) {
        return null;
    }

    return (
        <section className="node-panel" aria-label="Step editor">
            <header className="panel-head">
                <p className="eyebrow">Step</p>
                <button type="button" className="ghost-icon" aria-label="Close" onClick={onClose}><X aria-hidden="true" /></button>
            </header>
            {(
                <>
                    <input
                        className="pill-input prompt-name"
                        aria-label="Step name"
                        value={draftName}
                        disabled={locked}
                        onChange={(event) => setDraftName(event.target.value)}
                        onBlur={() => {
                            const next = renameNode(document, node.name, draftName);
                            if (next === document) {
                                setDraftName(node.name);
                                return;
                            }
                            onRenamed(draftName.trim());
                            onChange(next);
                        }}
                    />
                    <div className="task-field">
                        <textarea
                            className="prompt-raw"
                            aria-label="Spoken task"
                            value={task}
                            disabled={locked || rewriting}
                            onChange={(event) => onChange(setTaskContent(document, node.name, event.target.value))}
                        />
                        {rewriteControls}
                    </div>
                    {rewriteError ? <p className="error">{rewriteError}</p> : null}
                    {locked ? <p className="muted">Finish reviewing the copilot&apos;s changes to edit this step.</p> : null}
                </>
            )}
        </section>
    );
}
