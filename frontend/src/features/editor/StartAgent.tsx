import { useRef, useState } from "react";
import { FileText, LoaderCircle, Paperclip, Sparkles, X } from "lucide-react";

import type { Attachment } from "../../api/copilot";

type StartAgentProps = {
    attachments: Attachment[];
    reading: boolean;
    attachError: string | null;
    onAttach: (files: FileList) => void;
    onDetach: (name: string) => void;
    onDraft: (prompt: string) => void;
    onManual: () => void;
};

const EXAMPLES = [
    "A scheduler for a family clinic that books, reschedules, and cancels visits.",
    "A dental office line that confirms tomorrow’s appointments and offers to move them.",
];

/** A blank agent starts from a description or the client's guidelines, or by hand. */
export function StartAgent({ attachments, reading, attachError, onAttach, onDetach, onDraft, onManual }: StartAgentProps) {
    const [prompt, setPrompt] = useState("");
    const fileInput = useRef<HTMLInputElement>(null);
    const ready = Boolean(prompt.trim()) || attachments.length > 0;

    function draft() {
        if (!ready) {
            return;
        }
        onDraft(prompt.trim() || "Build this clinic’s phone agent from the attached guidelines.");
    }

    return (
        <div className="start-agent" role="dialog" aria-label="Start a new agent">
            <div className="start-card">
                <span className="start-mark" aria-hidden="true"><Sparkles /></span>
                <h2>What should this agent do?</h2>
                <p className="muted">Describe it in a sentence, or attach the client’s guidelines. The copilot drafts the graph for you to review.</p>
                <div className="start-box">
                    <textarea
                        autoFocus
                        aria-label="Describe the agent"
                        placeholder="A scheduler for a family clinic that books, reschedules, and cancels…"
                        rows={4}
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                                event.preventDefault();
                                draft();
                            }
                        }}
                    />
                    {attachments.length > 0 || reading ? (
                        <div className="composer-chips">
                            {attachments.map((file) => (
                                <button key={file.name} type="button" className="chip chip-file" onClick={() => onDetach(file.name)} aria-label={`Remove ${file.name}`}>
                                    <FileText aria-hidden="true" />
                                    {file.name}
                                    <X aria-hidden="true" />
                                </button>
                            ))}
                            {reading ? <span className="chip chip-file is-loading"><LoaderCircle className="spin" aria-hidden="true" />Reading file…</span> : null}
                        </div>
                    ) : null}
                    <div className="start-actions">
                        <input
                            ref={fileInput}
                            type="file"
                            accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
                            multiple
                            hidden
                            onChange={(event) => {
                                if (event.target.files?.length) {
                                    onAttach(event.target.files);
                                }
                                event.target.value = "";
                            }}
                        />
                        <button type="button" className="btn" onClick={() => fileInput.current?.click()} disabled={reading}>
                            <Paperclip aria-hidden="true" />
                            Attach guidelines
                        </button>
                        <button type="button" className="btn btn-ai" onClick={draft} disabled={!ready || reading}>
                            <Sparkles aria-hidden="true" />
                            Draft with the copilot
                        </button>
                    </div>
                </div>
                {attachError ? <p className="error">{attachError}</p> : null}
                <div className="start-examples">
                    {EXAMPLES.map((example) => (
                        <button key={example} type="button" className="suggestion" onClick={() => setPrompt(example)}>
                            {example}
                        </button>
                    ))}
                </div>
                <button type="button" className="link start-manual" onClick={onManual}>
                    Create manually
                </button>
            </div>
        </div>
    );
}
