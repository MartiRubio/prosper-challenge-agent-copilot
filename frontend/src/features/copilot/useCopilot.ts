import { useEffect, useMemo, useRef, useState } from "react";

import {
    applyOpsOnServer,
    proposeChanges,
    readAttachment,
    replayCalls,
    type Attachment,
    type CoverageRule,
    type FlaggedCall,
    type ReplayResult,
} from "../../api/copilot";
import type { AgentDocument } from "../editor/agentDocument";
import type { FunctionTemplate } from "../function-catalog/functionTemplate";
import type { FocusChip } from "./focus";
import { reviewMarks, touchedNodes } from "./review";
import type { ReviewChange } from "./reviewChange";

type UseCopilotArgs = {
    agentId: string | null;
    document: AgentDocument | null;
    functions: FunctionTemplate[];
    replaceFunctions: (next: FunctionTemplate[]) => void;
    editDocument: (next: AgentDocument) => void;
};

export type ReplayState =
    | { status: "running" }
    | { status: "done"; results: ReplayResult[] }
    | { status: "error"; error: string };

/** One request to the copilot and what came back. */
export type CopilotRequest = {
    id: string;
    message: string;
    focus: FocusChip[];
    calls: FlaggedCall[];
    attachments: string[];
    /** The agent as it was when the request was sent: the "before" of a replay. */
    before: AgentDocument;
    summary: string;
    changes: ReviewChange[] | null;
    coverage: CoverageRule[];
    warnings: string[];
    error: string | null;
    replay: ReplayState | null;
};

let requestSerial = 0;

export function useCopilot({ agentId, document, functions, replaceFunctions, editDocument }: UseCopilotArgs) {
    const [focus, setFocus] = useState<FocusChip[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [reading, setReading] = useState(false);
    const [attachError, setAttachError] = useState<string | null>(null);
    const [requests, setRequests] = useState<CopilotRequest[]>([]);
    const [index, setIndex] = useState(0);
    const [sending, setSending] = useState(false);
    const [applying, setApplying] = useState(false);
    const [hot, setHot] = useState<string[]>([]);
    const agentRef = useRef(agentId);
    agentRef.current = agentId;

    useEffect(() => {
        setFocus([]);
        setAttachments([]);
        setAttachError(null);
        setRequests([]);
        setIndex(0);
        setHot([]);
        setSending(false);
        setApplying(false);
    }, [agentId]);

    const visible = requests[index] ?? null;
    // Every open card across requests is previewed and locks the canvas, not only the one on screen.
    const pending = useMemo(
        () => requests.flatMap((request) => (request.changes ?? []).filter((change) => change.status === "pending")),
        [requests],
    );
    const locked = pending.length > 0;
    const marks = useMemo(() => (locked ? reviewMarks(pending, hot) : null), [locked, pending, hot]);

    function updateRequest(id: string, patch: (request: CopilotRequest) => CopilotRequest) {
        setRequests((current) => current.map((request) => (request.id === id ? patch(request) : request)));
    }

    function addFocus(chips: FocusChip[]) {
        setFocus((current) => {
            const next = [...current];
            for (const chip of chips) {
                if (!next.some((item) => item.kind === chip.kind && item.label === chip.label)) {
                    next.push(chip);
                }
            }
            return next;
        });
    }

    function removeFocus(chip: FocusChip) {
        setFocus((current) => current.filter((item) => item.kind !== chip.kind || item.label !== chip.label));
    }

    async function attach(files: FileList | File[]) {
        setAttachError(null);
        setReading(true);
        const owner = agentRef.current;
        try {
            for (const file of Array.from(files)) {
                const read = await readAttachment(file);
                if (agentRef.current !== owner) {
                    return;
                }
                setAttachments((current) => [...current.filter((item) => item.name !== read.name), read]);
            }
        } catch (caught) {
            setAttachError(caught instanceof Error ? caught.message : "That file could not be read.");
        } finally {
            setReading(false);
        }
    }

    function detach(name: string) {
        setAttachments((current) => current.filter((item) => item.name !== name));
    }

    async function send(message: string, calls: FlaggedCall[] = []) {
        const text = message.trim();
        if (!document || !agentId || !text || sending) {
            return;
        }
        requestSerial += 1;
        const request: CopilotRequest = {
            id: `r${requestSerial}`,
            message: text,
            focus,
            calls: calls.filter((call) => call.agent_id === agentId),
            attachments: attachments.map((item) => item.name),
            before: document,
            summary: "",
            changes: null,
            coverage: [],
            warnings: [],
            error: null,
            replay: null,
        };
        const sentAttachments = attachments;
        setRequests((current) => [...current, request]);
        setIndex(requests.length);
        // Attachments stay attached: follow-up requests usually need the same guidelines.
        setFocus([]);
        setSending(true);
        setHot([]);
        try {
            const result = await proposeChanges({
                agentId,
                agent: document,
                catalog: functions,
                message: text,
                focus: request.focus,
                calls: request.calls,
                attachments: sentAttachments,
            });
            if (agentRef.current !== agentId) {
                return;
            }
            updateRequest(request.id, (current) => ({
                ...current,
                summary: result.summary,
                coverage: result.coverage ?? [],
                warnings: result.warnings ?? [],
                // The server numbers changes c1, c2… on every request; the request id keeps them apart.
                changes: result.changes.map((change) => ({ ...change, id: `${request.id}:${change.id}`, status: "pending" })),
            }));
        } catch (caught) {
            updateRequest(request.id, (current) => ({
                ...current,
                error: caught instanceof Error ? caught.message : "The copilot could not read that.",
            }));
        } finally {
            setSending(false);
        }
    }

    async function keep(ids: string[]) {
        if (!document || !agentId || applying) {
            return;
        }
        const chosen = pending.filter((change) => ids.includes(change.id));
        const ops = chosen.flatMap((change) => change.ops);
        const owner = requests.find((request) => request.changes?.some((change) => ids.includes(change.id)));
        if (!owner || ops.length === 0) {
            discard(chosen.filter((change) => change.ops.length === 0).map((change) => change.id));
            return;
        }
        setApplying(true);
        try {
            const result = await applyOpsOnServer(document, ops, functions);
            if (agentRef.current !== agentId) {
                return;
            }
            editDocument(result.agent);
            if (JSON.stringify(result.functions) !== JSON.stringify(functions)) {
                replaceFunctions(result.functions);
            }
            setStatus(ids, "kept", owner.id);
        } catch (caught) {
            updateRequest(owner.id, (current) => ({
                ...current,
                error: caught instanceof Error ? caught.message : "That change could not be applied.",
            }));
        } finally {
            setApplying(false);
        }
    }

    function discard(ids: string[]) {
        if (ids.length > 0) {
            setStatus(ids, "discarded");
        }
    }

    function setStatus(ids: string[], status: "kept" | "discarded", clearErrorOn?: string) {
        setRequests((current) => current.map((request) => ({
            ...request,
            error: request.id === clearErrorOn ? null : request.error,
            changes: request.changes?.map((change) => (
                ids.includes(change.id) && change.status === "pending" ? { ...change, status } : change
            )) ?? null,
        })));
        setHot([]);
    }

    /** Call the flagged calls again, as a simulated caller, on the agent before and after this request. */
    async function replay(requestId: string) {
        const request = requests.find((item) => item.id === requestId);
        if (!request || !document || request.calls.length === 0) {
            return;
        }
        updateRequest(requestId, (current) => ({ ...current, replay: { status: "running" } }));
        try {
            const results = await replayCalls({
                before: request.before,
                after: document,
                calls: request.calls,
                catalog: functions,
            });
            updateRequest(requestId, (current) => ({ ...current, replay: { status: "done", results } }));
        } catch (caught) {
            updateRequest(requestId, (current) => ({
                ...current,
                replay: { status: "error", error: caught instanceof Error ? caught.message : "The replay could not run." },
            }));
        }
    }

    /** Hand the replays that still fail back to the copilot as new flagged calls. */
    function sendReplayFailures(requestId: string) {
        const request = requests.find((item) => item.id === requestId);
        if (!request || request.replay?.status !== "done" || !agentId) {
            return;
        }
        const failing = request.replay.results.filter((result) => !result.after.passed);
        const calls: FlaggedCall[] = failing.map((result) => {
            const original = request.calls.find((call) => call.id === result.call_id);
            return {
                id: `replay-${result.call_id}`,
                agent_id: agentId,
                title: `Replay of ${result.title}`,
                feedback: `Still failing after the last change: ${result.after.reason} Original feedback: ${original?.feedback ?? ""}`,
                turns: result.after.transcript,
            };
        });
        void send("The last change did not hold when the flagged calls were replayed. Fix what still fails.", calls);
    }

    function hover(id: string | null) {
        const change = id ? pending.find((item) => item.id === id) : null;
        setHot(change ? touchedNodes(change) : []);
    }

    return {
        focus,
        addFocus,
        removeFocus,
        attachments,
        attach,
        detach,
        reading,
        attachError,
        requests,
        index,
        setIndex,
        visible,
        sending,
        applying,
        pending,
        marks,
        locked,
        send,
        keep,
        discard,
        replay,
        sendReplayFailures,
        hover,
    };
}
