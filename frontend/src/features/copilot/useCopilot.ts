import { useEffect, useMemo, useState } from "react";

import { applyChanges, editAgent, type FlaggedCall } from "../../api/copilot";
import type { AgentDocument } from "../editor/agentDocument";
import type { FunctionTemplate } from "../function-catalog/functionTemplate";
import { reviewMarks, touchedNodes } from "./review";
import type { FocusChip } from "./focus";
import type { ReviewChange } from "./patch";

type UseCopilotArgs = {
    agentId: string | null;
    document: AgentDocument | null;
    functions: FunctionTemplate[];
    replaceFunctions: (next: FunctionTemplate[]) => void;
    editDocument: (next: AgentDocument) => void;
};

export type CopilotTurn = {
    id: string;
    message: string;
    focus: FocusChip[];
    summary: string;
    changes: ReviewChange[] | null;
    error: string | null;
};

let turnSerial = 0;

function blankTurn(): CopilotTurn {
    turnSerial += 1;
    return {
        id: `t${turnSerial}`,
        message: "",
        focus: [],
        summary: "",
        changes: null,
        error: null,
    };
}

export function useCopilot({ agentId, document, functions, replaceFunctions, editDocument }: UseCopilotArgs) {
    const [focus, setFocus] = useState<FocusChip[]>([]);
    const [turns, setTurns] = useState<CopilotTurn[]>(() => [blankTurn()]);
    const [index, setIndex] = useState(0);
    const [sending, setSending] = useState(false);
    const [hot, setHot] = useState<string[]>([]);
    const [applying, setApplying] = useState(false);

    useEffect(() => {
        setFocus([]);
        setTurns([blankTurn()]);
        setIndex(0);
        setHot([]);
    }, [agentId]);

    const visible = turns[index] ?? turns[0];
    const changes = visible?.changes ?? null;
    const marks = useMemo(
        () => (changes?.some((change) => change.status === "pending") ? reviewMarks(changes, hot) : null),
        [changes, hot],
    );
    const locked = turns.some((turn) => turn.changes?.some((change) => change.status === "pending"));
    const canAdvance = !sending && (index < turns.length - 1 || Boolean(turns[turns.length - 1]?.message));

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

    function retreat() {
        setIndex((current) => Math.max(0, current - 1));
        setHot([]);
    }

    function advance() {
        if (sending) {
            return;
        }
        setHot([]);
        if (index < turns.length - 1) {
            setIndex(index + 1);
            return;
        }
        const last = turns[turns.length - 1];
        if (!last?.message) {
            return;
        }
        setTurns([...turns, blankTurn()]);
        setIndex(turns.length);
    }

    async function send(message: string, calls: FlaggedCall[] = []) {
        const text = message.trim();
        if (!document || !agentId || !text || sending) {
            return;
        }
        const owned = calls.filter((call) => call.agent_id === agentId);
        const sentFocus = focus;
        const last = turns[turns.length - 1] ?? blankTurn();
        const target = last.message ? blankTurn() : last;
        const prepared = (last.message ? [...turns, target] : turns).map((turn) => (
            turn.id === target.id
                ? { ...turn, message: text, focus: sentFocus, summary: "", changes: null, error: null }
                : turn
        ));
        setTurns(prepared);
        setIndex(prepared.findIndex((turn) => turn.id === target.id));
        setFocus([]);
        setSending(true);
        setHot([]);
        try {
            const result = await editAgent({
                agentId,
                agent: document,
                catalog: functions,
                message: text,
                focus: sentFocus,
                calls: owned,
            });
            setTurns((current) => current.map((turn) => (
                turn.id === target.id
                    ? {
                        ...turn,
                        summary: result.summary,
                        changes: result.changes.map((change) => ({ ...change, status: "pending" as const })),
                        error: null,
                    }
                    : turn
            )));
        } catch (caught) {
            const messageText = caught instanceof Error ? caught.message : "The copilot could not read that.";
            setTurns((current) => current.map((turn) => (
                turn.id === target.id ? { ...turn, error: messageText } : turn
            )));
        } finally {
            setSending(false);
        }
    }

    async function keep(ids: string[]) {
        if (!document || applying) {
            return;
        }
        const turn = turns.find((item) => item.changes?.some((change) => ids.includes(change.id) && change.status === "pending"));
        if (!turn?.changes) {
            return;
        }
        const chosen = turn.changes.filter((change) => ids.includes(change.id) && change.status === "pending");
        const ops = chosen.flatMap((change) => change.ops);
        if (ops.length === 0) {
            return;
        }
        setApplying(true);
        try {
            const result = await applyChanges(document, ops, functions);
            editDocument(result.agent);
            if (JSON.stringify(result.functions) !== JSON.stringify(functions)) {
                replaceFunctions(result.functions);
            }
            setTurns((current) => current.map((item) => (
                item.id === turn.id
                    ? {
                        ...item,
                        error: null,
                        changes: item.changes?.map((change) => (
                            ids.includes(change.id) && change.status === "pending"
                                ? { ...change, status: "kept" as const }
                                : change
                        )) ?? null,
                    }
                    : item
            )));
            setHot([]);
        } catch (caught) {
            const messageText = caught instanceof Error ? caught.message : "That change could not be applied.";
            setTurns((current) => current.map((item) => (
                item.id === turn.id ? { ...item, error: messageText } : item
            )));
        } finally {
            setApplying(false);
        }
    }

    function discard(ids: string[]) {
        setTurns((current) => current.map((turn) => ({
            ...turn,
            changes: turn.changes?.map((change) => (
                ids.includes(change.id) && change.status === "pending"
                    ? { ...change, status: "discarded" as const }
                    : change
            )) ?? null,
        })));
        setHot([]);
    }

    function hover(id: string | null) {
        if (!id || !changes) {
            setHot([]);
            return;
        }
        const change = changes.find((item) => item.id === id);
        setHot(change ? touchedNodes(change) : []);
    }

    return {
        focus,
        addFocus,
        removeFocus,
        turns,
        index,
        retreat,
        advance,
        canAdvance,
        sending,
        applying,
        summary: visible?.summary ?? "",
        changes,
        marks,
        locked,
        error: visible?.error ?? null,
        send,
        keep,
        discard,
        hover,
    };
}
