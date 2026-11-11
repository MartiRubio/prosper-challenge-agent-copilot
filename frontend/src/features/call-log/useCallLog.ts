import { useCallback, useEffect, useRef, useState } from "react";

import { checkCall, listCalls, type FlaggedCall, type LoggedCall } from "../../api/copilot";

const CHECKS_AT_ONCE = 3;
const AFTER_CALL_DELAY_MS = 1200;

/**
 * The call log of the open agent. Every call without a check is checked by the
 * copilot as soon as it shows up, so a finished test call is reviewed without
 * anyone asking. A call the check flags is pre-flagged with its feedback.
 */
export function useCallLog(agentId: string | null, callLive: boolean) {
    const [calls, setCalls] = useState<LoggedCall[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState<string[]>([]);
    const [flags, setFlags] = useState<Record<string, string>>({});
    const touched = useRef(new Set<string>());
    const inFlight = useRef(new Set<string>());
    const agentRef = useRef(agentId);
    const wasLive = useRef(false);
    agentRef.current = agentId;

    const runCheck = useCallback(async (owner: string, call: LoggedCall) => {
        if (inFlight.current.has(call.id)) {
            return;
        }
        inFlight.current.add(call.id);
        setChecking((current) => [...current, call.id]);
        try {
            const check = await checkCall(owner, call.id);
            if (agentRef.current !== owner) {
                return;
            }
            setCalls((current) => current.map((item) => (item.id === call.id ? { ...item, check } : item)));
            if (check.status === "issue" && !touched.current.has(call.id)) {
                setFlags((current) => ({ ...current, [call.id]: current[call.id] || check.feedback || check.issue }));
            }
        } catch {
            // A failed check leaves the call unchecked; the row offers a retry.
        } finally {
            inFlight.current.delete(call.id);
            setChecking((current) => current.filter((id) => id !== call.id));
        }
    }, []);

    const checkAll = useCallback(async (owner: string, found: LoggedCall[]) => {
        const queue = found.filter((call) => !call.check);
        const workers = Array.from({ length: Math.min(CHECKS_AT_ONCE, queue.length) }, async () => {
            while (queue.length && agentRef.current === owner) {
                const next = queue.shift();
                if (next) {
                    await runCheck(owner, next);
                }
            }
        });
        await Promise.all(workers);
    }, [runCheck]);

    const refresh = useCallback(async () => {
        const owner = agentRef.current;
        if (!owner) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const found = await listCalls(owner);
            if (agentRef.current !== owner) {
                return;
            }
            setCalls(found);
            setFlags((current) => {
                const next = { ...current };
                for (const call of found) {
                    if (call.check?.status === "issue" && !touched.current.has(call.id) && next[call.id] === undefined) {
                        next[call.id] = call.check.feedback || call.check.issue;
                    }
                }
                return next;
            });
            void checkAll(owner, found);
        } catch (caught) {
            if (agentRef.current === owner) {
                setError(caught instanceof Error ? caught.message : "Could not load the call log.");
            }
        } finally {
            if (agentRef.current === owner) {
                setLoading(false);
            }
        }
    }, [checkAll]);

    useEffect(() => {
        setCalls([]);
        setFlags({});
        setChecking([]);
        touched.current = new Set();
        void refresh();
    }, [agentId, refresh]);

    useEffect(() => {
        const ended = wasLive.current && !callLive;
        wasLive.current = callLive;
        if (!ended) {
            return;
        }
        const handle = window.setTimeout(() => void refresh(), AFTER_CALL_DELAY_MS);
        return () => window.clearTimeout(handle);
    }, [callLive, refresh]);

    function toggleFlag(callId: string) {
        touched.current.add(callId);
        setFlags((current) => {
            const next = { ...current };
            if (next[callId] === undefined) {
                next[callId] = "";
            } else {
                delete next[callId];
            }
            return next;
        });
    }

    function setFeedback(callId: string, feedback: string) {
        touched.current.add(callId);
        setFlags((current) => ({ ...current, [callId]: feedback }));
    }

    function recheck(callId: string) {
        const call = calls.find((item) => item.id === callId);
        if (agentId && call) {
            void runCheck(agentId, call);
        }
    }

    const flagged: FlaggedCall[] = calls.flatMap((call) => {
        const feedback = flags[call.id];
        if (feedback === undefined) {
            return [];
        }
        return [{
            id: call.id,
            agent_id: call.agent_id,
            title: call.title,
            feedback,
            turns: call.turns,
            check: call.check,
            source: call.source,
            start_node: call.start_node,
            test_data: call.test_data,
        }];
    });
    const issues = calls.filter((call) => call.check?.status === "issue").length;

    return { calls, loading, error, checking, flags, flagged, issues, toggleFlag, setFeedback, recheck, refresh };
}

export type CallLogState = ReturnType<typeof useCallLog>;
