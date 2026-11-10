import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";

import { rewriteTask } from "../../api/copilot";
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
};

export function NodePanel({ document, nodeName, showPersona, locked, onChange, onRenamed, onPersona }: NodePanelProps) {
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
    }

    useEffect(() => {
        if (noteOpen) {
            noteRef.current?.focus();
        }
    }, [noteOpen]);

    async function rewrite() {
        const message = note.trim();
        if (!node || locked || rewriting || !message) {
            return;
        }
        setNoteOpen(false);
        setRewriting(true);
        setRewriteError(null);
        try {
            const content = await rewriteTask(document, node.name, task, message);
            onChange(setTaskContent(document, node.name, content));
            setNote("");
        } catch (caught) {
            setRewriteError(caught instanceof Error ? caught.message : "The step could not be rewritten.");
        } finally {
            setRewriting(false);
        }
    }

    if (showPersona) {
        return (
            <section className="node-panel" aria-label="General prompt">
                <p className="eyebrow">General prompt</p>
                <div className="task-field is-plain">
                    <textarea
                        className="prompt-raw"
                        aria-label="General prompt"
                        value={document.persona ?? ""}
                        disabled={locked}
                        onChange={(event) => onPersona(event.target.value)}
                    />
                </div>
            </section>
        );
    }

    return (
        <section className="node-panel" aria-label="Step editor">
            {node ? (
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
                                    placeholder="tell the LLM what to improve"
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
                            aria-label="Rewrite this step"
                            aria-expanded={noteOpen}
                            disabled={locked || rewriting}
                            onClick={() => setNoteOpen((open) => !open)}
                        >
                            <Sparkles className="nav-icon" aria-hidden="true" />
                        </button>
                    </div>
                    {rewriteError ? <p className="error">{rewriteError}</p> : null}
                </>
            ) : (
                <p className="muted">Click a step to edit what it says.</p>
            )}
        </section>
    );
}
