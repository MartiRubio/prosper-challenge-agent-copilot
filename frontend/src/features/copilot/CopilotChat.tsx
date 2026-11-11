import { useEffect, useRef, useState } from "react";
import {
    ArrowRight,
    BadgeCheck,
    ChevronLeft,
    ChevronRight,
    CircleCheck,
    CircleX,
    FileText,
    LoaderCircle,
    Paperclip,
    Play,
    Quote,
    Repeat2,
    SendHorizontal,
    Sparkles,
    X,
} from "lucide-react";

import type { Attachment, ReplayResult, ReplayRun } from "../../api/copilot";
import type { AgentDocument } from "../editor/agentDocument";
import { describeChange } from "./describeChange";
import type { FocusChip } from "./focus";
import type { Evidence } from "./patch";
import { blockReason, dependencies, reviewOrder } from "./review";
import type { ReviewChange } from "./reviewChange";
import type { CopilotRequest } from "./useCopilot";

type CopilotChatProps = {
    document: AgentDocument;
    focus: FocusChip[];
    attachments: Attachment[];
    reading: boolean;
    attachError: string | null;
    requests: CopilotRequest[];
    index: number;
    sending: boolean;
    applying: boolean;
    onIndex: (index: number) => void;
    onRemoveFocus: (chip: FocusChip) => void;
    onAttach: (files: FileList) => void;
    onDetach: (name: string) => void;
    onSend: (message: string) => void;
    onKeep: (ids: string[]) => void;
    onDiscard: (ids: string[]) => void;
    onHover: (id: string | null) => void;
    onReplay: (requestId: string) => void;
    onSendFailures: (requestId: string) => void;
    onOpenCall: (callId: string) => void;
};

const SUGGESTIONS = [
    "Build a clinic scheduler that can book, reschedule, or cancel.",
    "Callers who mention an emergency should be told to hang up and dial 911.",
    "Ask for date of birth before offering times.",
];

export function CopilotChat(props: CopilotChatProps) {
    const { requests, index, sending } = props;
    const request = requests[index] ?? null;
    const [draft, setDraft] = useState("");
    const fileInput = useRef<HTMLInputElement>(null);
    const log = useRef<HTMLDivElement>(null);
    const progress = request
        ? `${request.id}:${request.changes?.length ?? -1}:${request.error ?? ""}:${request.replay?.status ?? ""}`
        : "";

    // Follow new content (cards, errors, replay results) like a chat does.
    useEffect(() => {
        const element = log.current;
        if (element) {
            element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
        }
    }, [progress]);

    function submit(text = draft) {
        const message = text.trim();
        if (!message || sending) {
            return;
        }
        setDraft("");
        props.onSend(message);
    }

    return (
        <aside className="copilot" aria-label="Copilot">
            <header className="copilot-head">
                <h2>
                    <Sparkles className="nav-icon" aria-hidden="true" />
                    Copilot
                </h2>
                {requests.length > 1 ? (
                    <div className="request-nav">
                        <button type="button" className="ghost-icon" aria-label="Previous request" disabled={index === 0} onClick={() => props.onIndex(index - 1)}>
                            <ChevronLeft aria-hidden="true" />
                        </button>
                        <span>Request {index + 1} of {requests.length}</span>
                        <button type="button" className="ghost-icon" aria-label="Next request" disabled={index >= requests.length - 1} onClick={() => props.onIndex(index + 1)}>
                            <ChevronRight aria-hidden="true" />
                        </button>
                    </div>
                ) : null}
            </header>

            <div className="copilot-log" ref={log}>
                {request ? (
                    <RequestView {...props} request={request} />
                ) : (
                    <div className="copilot-empty">
                        <p>Describe a change, attach the client&apos;s guidelines, or shift-drag part of the graph to focus on it.</p>
                        <p className="muted">Flagged calls in the Call log come here too.</p>
                        <div className="suggestions">
                            {SUGGESTIONS.map((text) => (
                                <button key={text} type="button" className="suggestion" onClick={() => submit(text)} disabled={sending}>
                                    {text}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <form
                className="composer"
                onSubmit={(event) => {
                    event.preventDefault();
                    submit();
                }}
            >
                {props.focus.length > 0 || props.attachments.length > 0 || props.reading ? (
                    <div className="composer-chips">
                        {props.focus.map((chip) => (
                            <button
                                key={`${chip.kind}:${chip.label}`}
                                type="button"
                                className={`chip chip-${chip.kind}`}
                                onClick={() => props.onRemoveFocus(chip)}
                                aria-label={`Remove ${chip.label} from focus`}
                            >
                                {chip.label}
                                <X aria-hidden="true" />
                            </button>
                        ))}
                        {props.attachments.map((file) => (
                            <button
                                key={file.name}
                                type="button"
                                className="chip chip-file"
                                onClick={() => props.onDetach(file.name)}
                                title={`${file.characters.toLocaleString()} characters${file.truncated ? ", truncated" : ""}`}
                                aria-label={`Remove ${file.name}`}
                            >
                                <FileText aria-hidden="true" />
                                {file.name}
                                <X aria-hidden="true" />
                            </button>
                        ))}
                        {props.reading ? (
                            <span className="chip chip-file is-loading">
                                <LoaderCircle className="spin" aria-hidden="true" />
                                Reading file…
                            </span>
                        ) : null}
                    </div>
                ) : null}
                {props.attachError ? <p className="error">{props.attachError}</p> : null}
                <div className="composer-box">
                    <textarea
                        aria-label="Tell the copilot what to change"
                        placeholder={props.attachments.length ? "What should the copilot do with these guidelines?" : "Ask for a change…"}
                        value={draft}
                        rows={2}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                submit();
                            }
                        }}
                    />
                    <div className="composer-actions">
                        <input
                            ref={fileInput}
                            type="file"
                            accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
                            multiple
                            hidden
                            onChange={(event) => {
                                if (event.target.files?.length) {
                                    props.onAttach(event.target.files);
                                }
                                event.target.value = "";
                            }}
                        />
                        <button
                            type="button"
                            className="ghost-icon"
                            aria-label="Attach guidelines (.txt, .md, .pdf)"
                            title="Attach guidelines (.txt, .md, .pdf)"
                            onClick={() => fileInput.current?.click()}
                            disabled={props.reading}
                        >
                            <Paperclip aria-hidden="true" />
                        </button>
                        <button type="submit" className={sending ? "send-button is-busy" : "send-button"} disabled={sending || !draft.trim()} aria-label="Send">
                            {sending ? <LoaderCircle className="spin" aria-hidden="true" /> : <SendHorizontal aria-hidden="true" />}
                        </button>
                    </div>
                </div>
            </form>
        </aside>
    );
}

function RequestView(props: CopilotChatProps & { request: CopilotRequest }) {
    const { request, document, applying } = props;
    const changes = request.changes ?? [];
    const pending = changes.filter((change) => change.status === "pending");
    const batch = new Set(pending.map((change) => change.id));
    const keepable = pending.filter((change) => !blockReason(change, document, changes, batch));
    const callTitles = Object.fromEntries(request.calls.map((call) => [call.id, call.title]));
    const kept = changes.some((change) => change.status === "kept");
    const thinking = !request.changes && !request.error;

    return (
        <div className="request">
            <div className="bubble">
                <p>{request.message}</p>
                {request.focus.length || request.attachments.length || request.calls.length ? (
                    <div className="bubble-meta">
                        {request.focus.map((chip) => <span key={chip.label} className={`chip chip-${chip.kind} is-fixed`}>{chip.label}</span>)}
                        {request.attachments.map((name) => (
                            <span key={name} className="chip chip-file is-fixed"><FileText aria-hidden="true" />{name}</span>
                        ))}
                        {request.calls.map((call) => (
                            <button key={call.id} type="button" className="chip chip-call" onClick={() => props.onOpenCall(call.id)}>
                                {call.title}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>

            {thinking ? (
                <div className="thinking" role="status">
                    <LoaderCircle className="spin" aria-hidden="true" />
                    {request.calls.length ? "Reading the calls against the graph…" : request.attachments.length ? "Reading the guidelines…" : "Reading the graph…"}
                </div>
            ) : null}

            {request.summary ? <p className="copilot-summary">{request.summary}</p> : null}
            {request.warnings.length > 0 ? (
                <div className="warning-card" role="note">
                    <strong>Check before keeping</strong>
                    {request.warnings.map((warning) => <p key={warning}>{warning}</p>)}
                </div>
            ) : null}
            {request.coverage.length > 0 ? (
                <Coverage request={request} onSend={props.onSend} sending={props.sending} />
            ) : null}
            {request.changes && changes.length === 0 ? <p className="muted">Nothing needs to change.</p> : null}

            {pending.length > 0 ? (
                <ReviewCarousel
                    document={document}
                    changes={changes}
                    applying={applying}
                    callTitles={callTitles}
                    keepableCount={keepable.length}
                    onKeep={props.onKeep}
                    onDiscard={props.onDiscard}
                    onKeepAll={() => props.onKeep(keepable.map((change) => change.id))}
                    onDiscardAll={() => props.onDiscard(pending.map((change) => change.id))}
                    onHover={props.onHover}
                    onOpenCall={props.onOpenCall}
                />
            ) : null}

            {changes.some((change) => change.status !== "pending") ? (
                <ul className="decided">
                    {changes.filter((change) => change.status !== "pending").map((change) => (
                        <li key={change.id} className={`decided-${change.status}`}>
                            {change.status === "kept" ? <CircleCheck aria-hidden="true" /> : <X aria-hidden="true" />}
                            <span>{change.title}</span>
                            <span className="muted">{change.status === "kept" ? "Kept" : "Discarded"}</span>
                        </li>
                    ))}
                </ul>
            ) : null}

            {request.error ? <p className="error">{request.error}</p> : null}

            {request.calls.length > 0 && kept && pending.length === 0 ? (
                <ReplayPanel request={request} onReplay={props.onReplay} onSendFailures={props.onSendFailures} />
            ) : null}
        </div>
    );
}

function Coverage({ request, onSend, sending }: { request: CopilotRequest; onSend: (message: string) => void; sending: boolean }) {
    const [open, setOpen] = useState(false);
    const missing = request.coverage.filter((rule) => !rule.covered_by);
    const covered = request.coverage.length - missing.length;
    const titles = Object.fromEntries((request.changes ?? []).map((change) => [change.id.split(":").pop(), change.title]));
    return (
        <section className={missing.length ? "coverage has-missing" : "coverage"}>
            <button type="button" className="coverage-head" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
                <span className="coverage-meter" aria-hidden="true">
                    <span style={{ width: `${(covered / request.coverage.length) * 100}%` }} />
                </span>
                <span>
                    Guidelines covered: <strong>{covered} of {request.coverage.length}</strong> rules
                </span>
                <ChevronRight className={open ? "coverage-chevron is-open" : "coverage-chevron"} aria-hidden="true" />
            </button>
            {open ? (
                <ul>
                    {request.coverage.map((rule) => (
                        <li key={rule.rule} className={rule.covered_by ? "is-covered" : "is-missing"}>
                            {rule.covered_by ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}
                            <span>{rule.rule}</span>
                            <span className="muted">
                                {rule.covered_by === "existing" ? "already in the agent" : titles[rule.covered_by] ?? ""}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : null}
            {missing.length > 0 ? (
                <button
                    type="button"
                    className="btn btn-ai"
                    disabled={sending}
                    onClick={() => onSend(`Cover these guideline rules that nothing implements yet: ${missing.map((rule) => rule.rule).join("; ")}.`)}
                >
                    <Sparkles aria-hidden="true" />
                    Cover the {missing.length} missing {missing.length === 1 ? "rule" : "rules"}
                </button>
            ) : null}
        </section>
    );
}

function ReviewCarousel({
    document,
    changes,
    applying,
    callTitles,
    keepableCount,
    onKeep,
    onDiscard,
    onKeepAll,
    onDiscardAll,
    onHover,
    onOpenCall,
}: {
    document: AgentDocument;
    changes: ReviewChange[];
    applying: boolean;
    callTitles: Record<string, string>;
    keepableCount: number;
    onKeep: (ids: string[]) => void;
    onDiscard: (ids: string[]) => void;
    onKeepAll: () => void;
    onDiscardAll: () => void;
    onHover: (id: string | null) => void;
    onOpenCall: (callId: string) => void;
}) {
    const ordered = reviewOrder(document, changes);
    const [slot, setSlot] = useState(0);
    const [direction, setDirection] = useState<"next" | "previous">("next");
    const index = Math.min(slot, ordered.length - 1);
    const current = ordered[index];
    const needs = current ? dependencies(current, document, changes) : [];

    // The card on screen is the one lit up on the canvas.
    useEffect(() => {
        onHover(current?.id ?? null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current?.id]);

    if (!current) {
        return null;
    }

    function go(step: number) {
        setDirection(step > 0 ? "next" : "previous");
        setSlot(Math.max(0, Math.min(ordered.length - 1, index + step)));
    }

    const keepLabel = needs.length === 0
        ? "Keep"
        : `Keep with “${needs[0].title}”${needs.length > 1 ? ` and ${needs.length - 1} more` : ""}`;

    return (
        <section className="carousel" aria-label="Proposed changes">
            <header className="carousel-head">
                <div className="carousel-nav">
                    <button type="button" className="ghost-icon" aria-label="Previous change" disabled={index === 0} onClick={() => go(-1)}>
                        <ChevronLeft aria-hidden="true" />
                    </button>
                    <span>Change {index + 1} of {ordered.length}</span>
                    <button type="button" className="ghost-icon" aria-label="Next change" disabled={index >= ordered.length - 1} onClick={() => go(1)}>
                        <ChevronRight aria-hidden="true" />
                    </button>
                </div>
                {ordered.length > 1 ? (
                    <div className="carousel-bulk">
                        <button type="button" className="link" disabled={applying || keepableCount === 0} onClick={onKeepAll}>Keep all</button>
                        <button type="button" className="link muted-link" disabled={applying} onClick={onDiscardAll}>Discard all</button>
                    </div>
                ) : null}
            </header>
            {ordered.length > 1 ? (
                <div className="carousel-dots" aria-hidden="true">
                    {ordered.map((change, i) => <span key={change.id} className={i === index ? "is-on" : ""} />)}
                </div>
            ) : null}
            <ReviewCard
                key={current.id}
                slide={direction}
                document={document}
                change={current}
                changes={changes}
                applying={applying}
                callTitles={callTitles}
                keepLabel={keepLabel}
                onKeep={() => {
                    setDirection("next");
                    onKeep([...needs.map((change) => change.id), current.id]);
                }}
                onDiscard={() => {
                    setDirection("next");
                    onDiscard([current.id]);
                }}
                onHover={onHover}
                onOpenCall={onOpenCall}
            />
        </section>
    );
}

function ReviewCard({
    slide,
    document,
    change,
    changes,
    applying,
    callTitles,
    keepLabel,
    onKeep,
    onDiscard,
    onHover,
    onOpenCall,
}: {
    slide: "next" | "previous";
    document: AgentDocument;
    change: ReviewChange;
    changes: ReviewChange[];
    applying: boolean;
    callTitles: Record<string, string>;
    keepLabel: string;
    onKeep: () => void;
    onDiscard: () => void;
    onHover: (id: string | null) => void;
    onOpenCall: (callId: string) => void;
}) {
    const reason = blockReason(change, document, changes);
    const lines = describeChange(document, change);
    const pending = change.status === "pending";
    return (
        <article
            className={`review-card review-${change.status} slide-${slide}`}
            onMouseEnter={() => onHover(change.id)}
        >
            <header>
                <h3>{change.title}</h3>
                {!pending ? <span className={`status-tag tag-${change.status}`}>{change.status === "kept" ? "Kept" : "Discarded"}</span> : null}
            </header>
            {change.detail ? <p className="review-detail">{change.detail}</p> : null}
            {change.evidence?.map((item, i) => (
                <EvidenceQuote key={i} evidence={item} callTitles={callTitles} onOpenCall={onOpenCall} />
            ))}
            {pending ? (
                <ul className="change-lines">
                    {lines.map((line, i) => (
                        <li key={i} className={`line-${line.kind}`}>
                            <span className="line-label">{line.label}</span>
                            {line.before ? <p className="line-before">{line.before}</p> : null}
                            {line.after ? <p className="line-after">{line.after}</p> : null}
                        </li>
                    ))}
                </ul>
            ) : null}
            {reason ? <p className="review-need">{reason}</p> : null}
            {pending ? (
                <div className="review-actions">
                    <button type="button" className="btn btn-primary" disabled={applying || Boolean(reason)} onClick={onKeep}>
                        {keepLabel}
                    </button>
                    <button type="button" className="btn" disabled={applying} onClick={onDiscard}>
                        Discard
                    </button>
                </div>
            ) : null}
        </article>
    );
}

function EvidenceQuote({
    evidence,
    callTitles,
    onOpenCall,
}: {
    evidence: Evidence;
    callTitles: Record<string, string>;
    onOpenCall: (callId: string) => void;
}) {
    const source = evidence.source === "call"
        ? callTitles[evidence.ref] ?? evidence.ref
        : evidence.source === "attachment"
            ? evidence.ref
            : "Your request";
    const isCall = evidence.source === "call" && !evidence.ref.startsWith("replay-");
    return (
        <blockquote className={`evidence evidence-${evidence.source}`}>
            <Quote className="evidence-mark" aria-hidden="true" />
            <p>{evidence.quote}</p>
            <footer>
                {isCall ? (
                    <button type="button" className="link" onClick={() => onOpenCall(evidence.ref)}>{source}</button>
                ) : (
                    <span>{source}</span>
                )}
                {evidence.verified ? (
                    <span className="verified" title="This quote was found word for word in its source.">
                        <BadgeCheck aria-hidden="true" /> In source
                    </span>
                ) : (
                    <span className="unverified" title="This quote was not found word for word in its source.">Not found in source</span>
                )}
            </footer>
        </blockquote>
    );
}

function ReplayPanel({
    request,
    onReplay,
    onSendFailures,
}: {
    request: CopilotRequest;
    onReplay: (requestId: string) => void;
    onSendFailures: (requestId: string) => void;
}) {
    const replay = request.replay;
    const results = replay?.status === "done" ? replay.results : [];
    const failing = results.filter((result) => !result.after.passed).length;
    return (
        <section className="replay">
            <header>
                <div>
                    <h3>Does the fix hold?</h3>
                    <p className="muted">A simulated caller with the same goal calls the agent before and after.</p>
                </div>
                <button
                    type="button"
                    className={replay?.status === "running" ? "btn btn-ai is-busy" : "btn btn-ai"}
                    disabled={replay?.status === "running"}
                    onClick={() => onReplay(request.id)}
                >
                    {replay?.status === "running" ? <LoaderCircle className="spin" aria-hidden="true" /> : replay ? <Repeat2 aria-hidden="true" /> : <Play aria-hidden="true" />}
                    {replay?.status === "running" ? "Replaying…" : replay ? "Replay again" : `Replay ${request.calls.length} flagged ${request.calls.length === 1 ? "call" : "calls"}`}
                </button>
            </header>
            {replay?.status === "error" ? <p className="error">{replay.error}</p> : null}
            {results.map((result) => <ReplayRow key={result.call_id} result={result} />)}
            {failing > 0 ? (
                <button type="button" className="btn btn-ai" onClick={() => onSendFailures(request.id)}>
                    <Sparkles aria-hidden="true" />
                    Fix the {failing === 1 ? "replay that still fails" : `${failing} replays that still fail`}
                </button>
            ) : null}
        </section>
    );
}

function ReplayRow({ result }: { result: ReplayResult }) {
    const [open, setOpen] = useState<"before" | "after" | null>(null);
    const run = open ? result[open] : null;
    return (
        <div className="replay-row">
            <p className="replay-title">{result.title}</p>
            {result.brief.goal ? <p className="muted replay-goal">Caller: {result.brief.goal}</p> : null}
            <div className="replay-runs">
                <RunBadge label="Before" run={result.before} open={open === "before"} onToggle={() => setOpen(open === "before" ? null : "before")} />
                <ArrowRight className="replay-arrow" aria-hidden="true" />
                <RunBadge label="After" run={result.after} open={open === "after"} onToggle={() => setOpen(open === "after" ? null : "after")} />
            </div>
            <button
                type="button"
                className="replay-toggle"
                aria-expanded={Boolean(open)}
                onClick={() => setOpen(open ? null : "after")}
            >
                <ChevronRight className={open ? "coverage-chevron is-open" : "coverage-chevron"} aria-hidden="true" />
                {open ? "Hide the simulated calls" : "Read the simulated calls"}
            </button>
            {run && open ? (
                <div className="replay-detail">
                    <div className="segmented replay-tabs" role="tablist">
                        <button type="button" role="tab" aria-selected={open === "before"} onClick={() => setOpen("before")}>
                            {result.before.passed ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}
                            Before
                        </button>
                        <button type="button" role="tab" aria-selected={open === "after"} onClick={() => setOpen("after")}>
                            {result.after.passed ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}
                            After
                        </button>
                    </div>
                    <p className={run.passed ? "replay-reason is-pass" : "replay-reason is-fail"}>
                        <strong>{run.passed ? "Passed." : "Failed."}</strong> {run.reason}
                    </p>
                    <div className="replay-path">
                        {run.path.map((step, i) => (
                            <span key={`${step}-${i}`}>
                                {i > 0 ? <ArrowRight aria-hidden="true" /> : null}
                                <span className="step-chip">{step}</span>
                            </span>
                        ))}
                    </div>
                    <div className="mini-transcript" key={open}>
                        {run.transcript.map((turn, i) => (
                            <p key={i} className={`turn turn-${turn.role}`} style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}>
                                <span>{turn.role === "agent" ? `Agent${turn.step ? ` · ${turn.step}` : ""}` : "Simulated caller"}</span>
                                {turn.text}
                            </p>
                        ))}
                        <p className="replay-ended">{endedLabel(run.ended)}</p>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function endedLabel(ended: ReplayRun["ended"]): string {
    if (ended === "agent") {
        return "The agent ended the call.";
    }
    if (ended === "caller") {
        return "The caller hung up.";
    }
    if (ended === "turn_limit") {
        return "Stopped at the turn limit.";
    }
    return "The agent has no start step.";
}

function RunBadge({ label, run, open, onToggle }: { label: string; run: ReplayRun; open: boolean; onToggle: () => void }) {
    return (
        <button type="button" className={`run-badge ${run.passed ? "is-pass" : "is-fail"}${open ? " is-open" : ""}`} onClick={onToggle} aria-expanded={open}>
            {run.passed ? <CircleCheck aria-hidden="true" /> : <CircleX aria-hidden="true" />}
            {label}: {run.passed ? "passed" : "failed"}
        </button>
    );
}
