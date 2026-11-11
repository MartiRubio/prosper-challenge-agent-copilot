import { useEffect, useState } from "react";
import { Bot, CircleCheck, Flag, LoaderCircle, RotateCcw, Sparkles, X } from "lucide-react";

import type { LoggedCall } from "../../api/copilot";
import type { CallLogState } from "./useCallLog";

type CallLogProps = {
    log: CallLogState;
    sending: boolean;
    openCallId: string | null;
    onOpenCall: (callId: string) => void;
    onImprove: () => void;
    onFocusStep: (step: string) => void;
    onSimulate: (count: number) => void;
    onClose: () => void;
};

const SIMULATE_COUNTS = [1, 3, 5, 10];

export function CallLog({ log, sending, openCallId, onOpenCall, onImprove, onFocusStep, onSimulate, onClose }: CallLogProps) {
    const [picking, setPicking] = useState(false);
    const open = log.calls.find((call) => call.id === openCallId) ?? null;
    const ready = log.flagged.filter((call) => call.feedback.trim());
    const missingFeedback = log.flagged.length - ready.length;

    useEffect(() => {
        if (!open && log.calls[0]) {
            onOpenCall(log.calls[0].id);
        }
    }, [open, log.calls, onOpenCall]);

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
        <section className="call-log" aria-label="Call log">
            <div className="call-list">
                <header className="drawer-head">
                    <div>
                        <h2>Call log</h2>
                        <p className="muted">
                            {log.simulating
                                ? `Simulating ${log.simulating} ${log.simulating === 1 ? "call" : "calls"}…`
                                : log.checking.length
                                ? `Checking ${log.checking.length} ${log.checking.length === 1 ? "call" : "calls"}…`
                                : `${log.calls.length} calls · ${log.issues} with issues`}
                        </p>
                    </div>
                    <button type="button" className="ghost-icon" aria-label="Close the call log" onClick={onClose}>
                        <X aria-hidden="true" />
                    </button>
                </header>
                <div className="simulate-bar">
                    {log.simulating ? (
                        <span className="simulate-running"><LoaderCircle className="spin" aria-hidden="true" />Callers are on the line…</span>
                    ) : picking ? (
                        <div className="simulate-pick" role="group" aria-label="How many calls to simulate">
                            <span>How many?</span>
                            {SIMULATE_COUNTS.map((count) => (
                                <button
                                    key={count}
                                    type="button"
                                    className="count-chip"
                                    onClick={() => {
                                        setPicking(false);
                                        onSimulate(count);
                                    }}
                                >
                                    {count}
                                </button>
                            ))}
                            <button type="button" className="ghost-icon" aria-label="Cancel" onClick={() => setPicking(false)}>
                                <X aria-hidden="true" />
                            </button>
                        </div>
                    ) : (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPicking(true)}>
                            <Bot aria-hidden="true" />
                            Simulate calls
                        </button>
                    )}
                </div>
                {log.error ? <p className="error pad">{log.error}</p> : null}
                {log.loading && log.calls.length === 0 ? <p className="muted pad">Loading calls…</p> : null}
                {!log.loading && !log.error && log.calls.length === 0 ? (
                    <p className="muted pad">No calls yet. Place a test call or simulate a few, and they show up here, checked.</p>
                ) : null}
                <ul>
                    {log.calls.map((call) => (
                        <CallRow
                            key={call.id}
                            call={call}
                            open={call.id === openCallId}
                            checking={log.checking.includes(call.id)}
                            feedback={log.flags[call.id]}
                            onOpen={() => onOpenCall(call.id)}
                            onToggleFlag={() => log.toggleFlag(call.id)}
                            onFeedback={(text) => log.setFeedback(call.id, text)}
                        />
                    ))}
                </ul>
                <footer className="call-list-foot">
                    <button
                        type="button"
                        className={sending ? "btn btn-ai is-busy" : "btn btn-ai"}
                        disabled={ready.length === 0 || missingFeedback > 0 || sending}
                        onClick={onImprove}
                    >
                        {sending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                        {ready.length > 0 ? `Improve from ${ready.length} flagged ${ready.length === 1 ? "call" : "calls"}` : "Flag a call to improve"}
                    </button>
                    {missingFeedback > 0 ? <p className="muted">Say what went wrong on every flagged call.</p> : null}
                </footer>
            </div>
            <div className="call-transcript">
                {open ? (
                    <>
                        <header className="transcript-head">
                            <h3>{open.title}</h3>
                            <p className="muted">
                                {SOURCE_LABEL[open.source] ?? "Call"} · {formatDate(open.started_at)}
                                {open.start_node ? <> · started at <span className="step-chip">{open.start_node}</span></> : null}
                            </p>
                            {open.start_node && open.test_data && Object.keys(open.test_data).length ? (
                                <p className="muted test-data-line">
                                    Test data: {Object.entries(open.test_data).map(([key, value]) => `${key} ${value}`).join(" · ")}
                                </p>
                            ) : null}
                            {open.brief ? (
                                <p className="muted test-data-line">
                                    Caller: {open.brief.facts.name} · {open.brief.goal}
                                </p>
                            ) : null}
                        </header>
                        <CheckSummary call={open} checking={log.checking.includes(open.id)} onRecheck={() => log.recheck(open.id)} onFocusStep={onFocusStep} />
                        <div className="transcript">
                            {open.turns.map((turn, index) => {
                                const quoted = Boolean(open.check?.quote) && quoteMatches(turn.text, open.check?.quote ?? "");
                                return (
                                    <p key={`${open.id}-${index}`} className={`turn turn-${turn.role}${quoted ? " is-quoted" : ""}`}>
                                        <span>{turn.role === "agent" ? "Agent" : "Caller"}</span>
                                        {turn.text}
                                    </p>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <p className="muted pad">Select a call.</p>
                )}
            </div>
        </section>
    );
}

function CallRow({
    call,
    open,
    checking,
    feedback,
    onOpen,
    onToggleFlag,
    onFeedback,
}: {
    call: LoggedCall;
    open: boolean;
    checking: boolean;
    feedback: string | undefined;
    onOpen: () => void;
    onToggleFlag: () => void;
    onFeedback: (text: string) => void;
}) {
    const flagged = feedback !== undefined;
    return (
        <li className={`call-row${open ? " is-open" : ""}${flagged ? " is-flagged" : ""}`}>
            <div className="call-row-main">
                <button type="button" className="call-open" onClick={onOpen}>
                    <strong>{call.title}</strong>
                    <span className="call-meta">
                        <CheckBadge call={call} checking={checking} />
                        <span>{call.source === "simulated" ? "Simulated" : call.source === "test" ? "Test" : "Production"}</span>
                        <span>{formatDate(call.started_at)}</span>
                    </span>
                </button>
                <button
                    type="button"
                    className={flagged ? "flag-button is-flagged" : "flag-button"}
                    aria-label={flagged ? `Unflag ${call.title}` : `Flag ${call.title}`}
                    aria-pressed={flagged}
                    onClick={onToggleFlag}
                >
                    <Flag aria-hidden="true" />
                </button>
            </div>
            {flagged ? (
                <textarea
                    className="call-feedback"
                    aria-label={`Feedback for ${call.title}`}
                    placeholder="What went wrong?"
                    value={feedback}
                    rows={2}
                    onChange={(event) => onFeedback(event.target.value)}
                />
            ) : null}
        </li>
    );
}

function CheckBadge({ call, checking }: { call: LoggedCall; checking: boolean }) {
    if (checking) {
        return <span className="check-badge is-checking"><LoaderCircle className="spin" aria-hidden="true" />Checking</span>;
    }
    if (!call.check) {
        return <span className="check-badge">Not checked</span>;
    }
    if (call.check.status === "ok") {
        return <span className="check-badge is-ok"><CircleCheck aria-hidden="true" />Looks fine</span>;
    }
    return <span className={`check-badge is-issue sev-${call.check.severity}`}>Issue · {call.check.severity}</span>;
}

function CheckSummary({
    call,
    checking,
    onRecheck,
    onFocusStep,
}: {
    call: LoggedCall;
    checking: boolean;
    onRecheck: () => void;
    onFocusStep: (step: string) => void;
}) {
    const [justFocused, setJustFocused] = useState(false);
    const check = call.check;
    if (checking) {
        return <div className="check-card is-checking"><LoaderCircle className="spin" aria-hidden="true" /> The copilot is reading this call…</div>;
    }
    if (!check) {
        return (
            <div className="check-card">
                Not checked yet.
                <button type="button" className="link" onClick={onRecheck}>Check now</button>
            </div>
        );
    }
    if (check.status === "ok") {
        return (
            <div className="check-card is-ok">
                <CircleCheck aria-hidden="true" /> No problem found in this call.
                <button type="button" className="ghost-icon" aria-label="Check again" title="Check again" onClick={onRecheck}><RotateCcw aria-hidden="true" /></button>
            </div>
        );
    }
    return (
        <div className={`check-card is-issue sev-${check.severity}`}>
            <div className="check-card-head">
                <strong>{check.issue}</strong>
                <button type="button" className="ghost-icon" aria-label="Check again" title="Check again" onClick={onRecheck}><RotateCcw aria-hidden="true" /></button>
            </div>
            {check.step ? (
                <p>
                    Went wrong in{" "}
                    <button
                        type="button"
                        className="step-chip"
                        title="Add this step to the copilot's focus"
                        onClick={() => {
                            onFocusStep(check.step);
                            setJustFocused(true);
                        }}
                    >
                        {check.step}
                    </button>
                    {justFocused ? <span className="muted"> added to focus</span> : null}
                </p>
            ) : null}
            {check.feedback ? <p className="muted">Should have: {check.feedback}</p> : null}
        </div>
    );
}

const SOURCE_LABEL: Record<string, string> = {
    production: "Production call",
    sample: "Production call",
    test: "Test call",
    simulated: "Simulated call",
};

function quoteMatches(text: string, quote: string): boolean {
    const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const a = normalize(text);
    const b = normalize(quote);
    return Boolean(b) && (a.includes(b) || b.includes(a));
}

function formatDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return iso.slice(0, 10);
    }
    return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
