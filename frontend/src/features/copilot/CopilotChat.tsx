import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { AgentDocument } from "../editor/agentDocument";
import type { FocusChip } from "./focus";
import type { ReviewChange } from "./patch";
import type { CopilotTurn } from "./useCopilot";
import { blockReason, newFunctions, taskPairs } from "./review";

type CopilotChatProps = {
    document: AgentDocument;
    focus: FocusChip[];
    turns: CopilotTurn[];
    index: number;
    canAdvance: boolean;
    sending: boolean;
    applying: boolean;
    error: string | null;
    onRetreat: () => void;
    onAdvance: () => void;
    onRemoveFocus: (chip: FocusChip) => void;
    onSend: (message: string) => void;
    onKeep: (ids: string[]) => void;
    onDiscard: (ids: string[]) => void;
    onHover: (id: string | null) => void;
};

export function CopilotChat({
    document,
    focus,
    turns,
    index,
    canAdvance,
    sending,
    applying,
    error,
    onRetreat,
    onAdvance,
    onRemoveFocus,
    onSend,
    onKeep,
    onDiscard,
    onHover,
}: CopilotChatProps) {
    const [draft, setDraft] = useState("");
    const turn = turns[index] ?? turns[0];
    const drafting = Boolean(turn && !turn.message);
    const chips = drafting ? focus : [];
    const changes = turn?.changes ?? null;
    const pending = changes?.filter((change) => change.status === "pending") ?? [];
    const keepable = pending.filter((change) => !blockReason(change, document, changes ?? []));

    function submit() {
        const text = draft.trim();
        if (!text || sending || !drafting) {
            return;
        }
        setDraft("");
        onSend(text);
    }

    return (
        <aside className="copilot">
            <div className="turn-nav">
                <button type="button" className="turn-arrow" aria-label="Previous turn" disabled={index === 0} onClick={onRetreat}>
                    <ChevronLeft className="nav-icon" aria-hidden="true" />
                </button>
                <p className="eyebrow">Turn {index + 1} / {turns.length}</p>
                <button type="button" className="turn-arrow" aria-label="Next turn" disabled={!canAdvance} onClick={onAdvance}>
                    <ChevronRight className="nav-icon" aria-hidden="true" />
                </button>
            </div>
            <div className="copilot-log">
                {turn?.message ? <p className="turn-message">{turn.message}</p> : (
                    <p className="muted">Describe the flow, or send a selection from the canvas.</p>
                )}
                {turn?.summary ? <p className="copilot-summary">{turn.summary}</p> : null}
                {sending && turn?.message && !turn.summary && !turn.error ? <p className="copilot-loading">Reading the graph…</p> : null}
                {changes && pending.length > 0 ? (
                    <div className="review-actions">
                        <button type="button" className="pill" disabled={applying || keepable.length === 0} onClick={() => onKeep(keepable.map((change) => change.id))}>
                            Keep all
                        </button>
                        <button type="button" className="pill" disabled={applying} onClick={() => onDiscard(pending.map((change) => change.id))}>
                            Discard all
                        </button>
                    </div>
                ) : null}
                {changes?.map((change) => (
                    <ReviewCard
                        key={change.id}
                        document={document}
                        change={change}
                        changes={changes}
                        applying={applying}
                        onKeep={() => onKeep([change.id])}
                        onDiscard={() => onDiscard([change.id])}
                        onHover={onHover}
                    />
                ))}
                {error ? <p className="error">{error}</p> : null}
            </div>
            {chips.length > 0 ? (
                <div className="focus-chips">
                    {chips.map((chip) => (
                        <button
                            key={`${chip.kind}:${chip.label}`}
                            type="button"
                            className={`pill focus-chip ${chip.kind === "node" ? "focus-chip-node" : "focus-chip-edge"}${drafting ? "" : " is-fixed"}`}
                            onClick={() => {
                                if (drafting) {
                                    onRemoveFocus(chip);
                                }
                            }}
                        >
                            {chip.label}
                            {drafting ? <span aria-hidden="true"> ×</span> : null}
                        </button>
                    ))}
                </div>
            ) : null}
            {drafting ? (
                <>
                    <textarea
                        className="copilot-input"
                        aria-label="Tell the copilot what to change"
                        placeholder="Ask for a change"
                        value={draft}
                        disabled={sending}
                        rows={2}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                submit();
                            }
                        }}
                    />
                    <button
                        type="button"
                        className={sending ? "pill ai-button is-busy" : "pill ai-button"}
                        disabled={sending || !draft.trim()}
                        onClick={submit}
                    >
                        {sending ? "Working…" : "Send"}
                    </button>
                </>
            ) : null}
        </aside>
    );
}

function ReviewCard({
    document,
    change,
    changes,
    applying,
    onKeep,
    onDiscard,
    onHover,
}: {
    document: AgentDocument;
    change: ReviewChange;
    changes: ReviewChange[];
    applying: boolean;
    onKeep: () => void;
    onDiscard: () => void;
    onHover: (id: string | null) => void;
}) {
    const reason = blockReason(change, document, changes);
    const pairs = taskPairs(document, change);
    const created = newFunctions(change);
    const pending = change.status === "pending";
    return (
        <article
            className={`review-card review-${change.status}`}
            onMouseEnter={() => onHover(change.id)}
            onMouseLeave={() => onHover(null)}
        >
            <h3>{change.title}</h3>
            {change.detail ? <p>{change.detail}</p> : null}
            {pairs.map((pair) => (
                <div key={pair.next} className="review-sentences">
                    <p className="review-old">{pair.current || "Empty"}</p>
                    <p className="review-new">{pair.next}</p>
                </div>
            ))}
            {created.map((item) => (
                <p key={item.name} className="review-new">
                    New function {item.name}{item.fields ? `: ${item.fields}` : ""}
                </p>
            ))}
            {reason ? <p className="review-need">{reason}</p> : null}
            {pending ? (
                <div className="review-actions">
                    <button type="button" className="pill" disabled={applying || Boolean(reason)} onClick={onKeep}>
                        Keep
                    </button>
                    <button type="button" className="pill" disabled={applying} onClick={onDiscard}>
                        Discard
                    </button>
                </div>
            ) : (
                <p className="muted">{change.status === "kept" ? "Kept" : "Discarded"}</p>
            )}
        </article>
    );
}
