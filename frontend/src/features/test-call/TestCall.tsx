import { useEffect, useRef, useState } from "react";

import type { TransportState } from "@pipecat-ai/client-js";

import { startWebRtcCall } from "./startWebRtcCall";

type TestCallProps = {
    agentId: string | null;
    disabled: boolean;
};

export function TestCall({ agentId, disabled }: TestCallProps) {
    const [state, setState] = useState<TransportState | "idle">("idle");
    const [error, setError] = useState<string | null>(null);
    const disconnectRef = useRef<(() => Promise<void>) | null>(null);

    useEffect(() => {
        setState("idle");
        setError(null);
        return () => {
            void disconnectRef.current?.();
            disconnectRef.current = null;
        };
    }, [agentId]);

    async function toggle() {
        if (disconnectRef.current) {
            await disconnectRef.current();
            disconnectRef.current = null;
            setState("idle");
            setError(null);
            return;
        }
        if (!agentId || disabled) {
            return;
        }
        setError(null);
        setState("connecting");
        try {
            disconnectRef.current = await startWebRtcCall(agentId, setState);
        } catch (caught) {
            disconnectRef.current = null;
            setState("idle");
            setError(caught instanceof Error ? caught.message : "Could not start the call.");
        }
    }

    const live = state === "connected" || state === "ready" || state === "connecting" || state === "authenticating";

    return (
        <div className="test-call">
            <button type="button" className="call-button" onClick={() => void toggle()} disabled={!agentId || (disabled && !live)}>
                {live ? "End call" : "Test call"}
            </button>
            <p className={error ? "error" : "muted"}>{callStatus(state, error, disabled)}</p>
        </div>
    );
}

function callStatus(state: TransportState | "idle", error: string | null, disabled: boolean): string {
    if (error) {
        return error;
    }
    if (disabled && state === "idle") {
        return "Save to test these edits.";
    }
    if (state === "ready" || state === "connected") {
        return "On the call.";
    }
    if (state === "connecting" || state === "authenticating" || state === "initialized") {
        return "Connecting…";
    }
    return "Uses the saved agent.";
}
