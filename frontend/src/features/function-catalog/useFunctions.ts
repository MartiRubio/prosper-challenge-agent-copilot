import { useEffect, useRef, useState } from "react";

import { listFunctions, saveFunctions } from "../../api/functions";
import type { FunctionTemplate } from "./functionTemplate";

export function useFunctions() {
    const [functions, setFunctions] = useState<FunctionTemplate[]>([]);
    const [error, setError] = useState<string | null>(null);
    const latest = useRef(functions);
    const timer = useRef<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        listFunctions()
            .then((found) => {
                if (!cancelled) {
                    latest.current = found;
                    setFunctions(found);
                }
            })
            .catch((caught: unknown) => {
                if (!cancelled) {
                    setError(caught instanceof Error ? caught.message : "Could not load functions.");
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => () => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
        }
    }, []);

    function update(next: FunctionTemplate[]) {
        latest.current = next;
        setFunctions(next);
        setError(null);
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
        }
        timer.current = window.setTimeout(() => {
            void saveFunctions(latest.current).catch((caught: unknown) => {
                setError(caught instanceof Error ? caught.message : "Could not save functions.");
            });
        }, 400);
    }

    return { functions, error, update };
}
