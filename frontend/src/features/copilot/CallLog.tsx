import { useEffect, useRef, useState } from "react";
import { Flag } from "lucide-react";

import { listCalls, type FlaggedCall, type LoggedCall } from "../../api/copilot";

type CallLogProps = {
    agentId: string;
    callLive: boolean;
    sending: boolean;
    onImprove: (calls: FlaggedCall[]) => void;
};

export function CallLog({ agentId, callLive, sending, onImprove }: CallLogProps) {
    const [calls, setCalls] = useState<LoggedCall[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const [flags, setFlags] = useState<Record<string, string | null>>({});
    const wasLive = useRef(false);

    useEffect(() => {
        setFlags({});
        setOpenId(null);
    }, [agentId]);

    useEffect(() => {
        let cancelled = false;
        const delay = wasLive.current && !callLive ? 800 : 0;
        wasLive.current = callLive;
        if (callLive) {
            return;
        }
        const handle = window.setTimeout(() => {
            listCalls(agentId)
                .then((found) => {
                    if (!cancelled) {
                        setCalls(found);
                        setOpenId((current) => (
                            current && found.some((call) => call.id === current) ? current : found[0]?.id ?? null
                        ));
                    }
                })
                .catch((caught: unknown) => {
                    if (!cancelled) {
                        setError(caught instanceof Error ? caught.message : "Could not load the call log.");
                    }
                });
        }, delay);
        return () => {
            cancelled = true;
            window.clearTimeout(handle);
        };
    }, [agentId, callLive]);

    const open = calls.find((call) => call.id === openId) ?? null;
    const flagged = calls.flatMap((call) => {
        const feedback = flags[call.id];
        if (typeof feedback !== "string") {
            return [];
        }
        if (call.agent_id !== agentId) {
            return [];
        }
        return [{
            id: call.id,
            agent_id: call.agent_id,
            title: call.title,
            feedback,
            turns: call.turns,
        }];
    });

    return (
        <div className="call-log">
            <section className="call-list">
                <div className="call-list-head">
                    <p className="eyebrow">Calls</p>
                    <button
                        type="button"
                        className={sending ? "pill ai-button is-busy" : "pill ai-button"}
                        disabled={flagged.length === 0 || sending}
                        onClick={() => onImprove(flagged)}
                    >
                        {sending ? "Working…" : "Improve"}
                    </button>
                </div>
                {error ? <p className="error">{error}</p> : null}
                {!error && calls.length === 0 ? <p className="muted">No calls for this agent.</p> : null}
                <ul>
                    {calls.map((call) => (
                        <li key={call.id} className={call.id === openId ? "call-row is-open" : "call-row"}>
                            <button type="button" className="call-open" onClick={() => setOpenId(call.id)}>
                                <strong>{call.title}</strong>
                                <span>{call.started_at.slice(0, 10)}</span>
                            </button>
                            <button
                                type="button"
                                className={flags[call.id] === undefined ? "icon-button" : "icon-button is-flagged"}
                                aria-label={`Flag ${call.title}`}
                                aria-pressed={flags[call.id] !== undefined}
                                onClick={() => setFlags((current) => {
                                    const next = { ...current };
                                    if (next[call.id] === undefined) {
                                        next[call.id] = "";
                                    } else {
                                        delete next[call.id];
                                    }
                                    return next;
                                })}
                            >
                                <Flag className="nav-icon" aria-hidden="true" />
                            </button>
                            {flags[call.id] !== undefined ? (
                                <textarea
                                    className="call-feedback"
                                    aria-label={`Feedback for ${call.title}`}
                                    placeholder="What went wrong"
                                    value={flags[call.id] ?? ""}
                                    onChange={(event) => setFlags((current) => ({
                                        ...current,
                                        [call.id]: event.target.value,
                                    }))}
                                />
                            ) : null}
                        </li>
                    ))}
                </ul>
            </section>
            <section className="call-transcript">
                {open ? open.turns.map((turn, index) => (
                    <p key={`${open.id}-${index}`} className={`turn turn-${turn.role}`}>
                        <span>{turn.role === "agent" ? "Agent" : "Caller"}</span>
                        {turn.text}
                    </p>
                )) : <p className="muted">Select a call.</p>}
            </section>
        </div>
    );
}
