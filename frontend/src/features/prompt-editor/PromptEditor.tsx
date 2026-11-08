import { useEffect, useRef, useState } from "react";

import { renderMarkdown } from "./renderMarkdown";
import { TokenView, useTokenCount } from "./TokenView";

type PromptEditorProps = {
    title: string;
    label: string;
    value: string;
    model: string;
    onChange: (value: string) => void;
    onClose: () => void;
    name?: string;
    onRename?: (name: string) => boolean;
};

export function PromptEditor({ title, label, value, model, onChange, onClose, name, onRename }: PromptEditorProps) {
    const [view, setView] = useState<"raw" | "markdown">("raw");
    const [showTokens, setShowTokens] = useState(false);
    const [draftName, setDraftName] = useState(name ?? "");
    const [trackedName, setTrackedName] = useState(name);
    const tokens = useTokenCount(value, model);
    const layer = useRef<HTMLDivElement>(null);
    if (name !== trackedName) {
        setTrackedName(name);
        setDraftName(name ?? "");
    }

    useEffect(() => {
        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="prompt-backdrop" onMouseDown={onClose}>
            <section
                className="prompt-dialog"
                role="dialog"
                aria-label={title}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="prompt-toolbar">
                    {onRename && (
                        <input
                            className="pill-input prompt-name"
                            aria-label="Name"
                            value={draftName}
                            onChange={(event) => setDraftName(event.target.value)}
                            onBlur={() => {
                                if (!onRename(draftName)) {
                                    setDraftName(name ?? "");
                                }
                            }}
                        />
                    )}
                    <div className="pill-row">
                        <button
                            type="button"
                            className="pill"
                            aria-pressed={view === "raw"}
                            onClick={() => setView("raw")}
                        >
                            Raw
                        </button>
                        <button
                            type="button"
                            className="pill"
                            aria-pressed={view === "markdown"}
                            onClick={() => setView("markdown")}
                        >
                            Markdown
                        </button>
                    </div>
                    {view === "raw" && (
                        <button
                            type="button"
                            className="pill"
                            aria-pressed={showTokens}
                            onClick={() => setShowTokens((current) => !current)}
                        >
                            {showTokens ? `${tokens} tokens` : "Tokens"}
                        </button>
                    )}
                    <button type="button" className="pill" onClick={onClose}>
                        Close
                    </button>
                </header>
                {view === "raw" ? (
                    <div className="prompt-editor">
                        {showTokens && (
                            <div className="token-layer" ref={layer}>
                                <TokenView text={value} model={model} />
                            </div>
                        )}
                        <textarea
                            className={showTokens ? "prompt-raw is-tokenized" : "prompt-raw"}
                            value={value}
                            aria-label={label}
                            onChange={(event) => onChange(event.target.value)}
                            onScroll={(event) => {
                                if (layer.current) {
                                    layer.current.scrollTop = event.currentTarget.scrollTop;
                                    layer.current.scrollLeft = event.currentTarget.scrollLeft;
                                }
                            }}
                        />
                    </div>
                ) : (
                    <div
                        className="prompt-markdown"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
                    />
                )}
            </section>
        </div>
    );
}
