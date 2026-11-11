import { useCallback, useEffect, useRef, useState } from "react";

import { listFunctions, saveFunctions } from "../../api/functions";
import type { FunctionTemplate } from "./functionTemplate";

const SAVE_DELAY_MS = 400;

/**
 * The shared function catalog. Edits made in the Functions menu save on their
 * own after a short pause. Functions the copilot adds are only staged: they are
 * written when the agent that uses them is saved, and dropped when it is not.
 */
export function useFunctions() {
    const [functions, setFunctions] = useState<FunctionTemplate[]>([]);
    const [error, setError] = useState<string | null>(null);
    const latest = useRef(functions);
    const timer = useRef<number | null>(null);
    const staged = useRef(false);

    const load = useCallback(async () => {
        try {
            const found = await listFunctions();
            latest.current = found;
            staged.current = false;
            setFunctions(found);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not load functions.");
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const write = useCallback(async () => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
        try {
            await saveFunctions(latest.current);
            staged.current = false;
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not save functions.");
            throw caught;
        }
    }, []);

    // Leaving the page mid-pause still writes the last edit.
    useEffect(() => () => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            void saveFunctions(latest.current);
        }
    }, []);

    function update(next: FunctionTemplate[]) {
        latest.current = next;
        setFunctions(next);
        setError(null);
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
        }
        timer.current = window.setTimeout(() => void write().catch(() => undefined), SAVE_DELAY_MS);
    }

    function stage(next: FunctionTemplate[]) {
        latest.current = next;
        staged.current = true;
        setFunctions(next);
    }

    /** Write staged or pending edits now, before an agent that needs them is saved. */
    async function flush() {
        if (staged.current || timer.current !== null) {
            await write();
        }
    }

    /** Drop functions the copilot staged for an agent that was never saved. */
    function discardStaged() {
        if (staged.current) {
            void load();
        }
    }

    return { functions, error, update, stage, flush, discardStaged };
}
