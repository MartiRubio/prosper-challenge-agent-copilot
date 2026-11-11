import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

import { listVersions, type AgentVersion } from "../../api/agents";

type HistoryMenuProps = {
    agentId: string;
    /** Changes after every save, so the list is fetched fresh. */
    saveCount: number;
    onRestore: (versionId: string, savedAt: string) => void;
};

/** Every save keeps a full snapshot. Choosing one loads it as unsaved edits. */
export function HistoryMenu({ agentId, saveCount, onRestore }: HistoryMenuProps) {
    const [open, setOpen] = useState(false);
    const [versions, setVersions] = useState<AgentVersion[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setVersions(null);
    }, [agentId, saveCount]);

    useEffect(() => {
        if (!open || versions) {
            return;
        }
        let cancelled = false;
        listVersions(agentId)
            .then((found) => !cancelled && setVersions(found))
            .catch((caught: unknown) => !cancelled && setError(caught instanceof Error ? caught.message : "Could not load versions."));
        return () => {
            cancelled = true;
        };
    }, [open, versions, agentId]);

    useEffect(() => {
        if (!open) {
            return;
        }
        function onPointer(event: PointerEvent) {
            if (!root.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }
        window.addEventListener("pointerdown", onPointer);
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("pointerdown", onPointer);
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    return (
        <div className="menu-anchor" ref={root}>
            <button type="button" className="btn" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)}>
                <Clock aria-hidden="true" />
                History
            </button>
            {open ? (
                <div className="menu" role="menu">
                    <p className="menu-title">Saved versions</p>
                    {error ? <p className="error">{error}</p> : null}
                    {!versions && !error ? <p className="muted menu-empty">Loading…</p> : null}
                    {versions?.length === 0 ? <p className="muted menu-empty">Nothing saved yet. Every save keeps a copy here.</p> : null}
                    {versions?.map((version, index) => (
                        <button
                            key={version.id}
                            type="button"
                            role="menuitem"
                            className="menu-item"
                            onClick={() => {
                                setOpen(false);
                                onRestore(version.id, version.saved_at);
                            }}
                        >
                            <span>{formatTime(version.saved_at)}{index === 0 ? " · current" : ""}</span>
                            <span className="muted">{version.steps} steps</span>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export function formatTime(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso;
    }
    return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
