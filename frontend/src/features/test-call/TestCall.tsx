import { useEffect, useRef, useState, type RefObject } from "react";
import { ClipboardList, Phone, PhoneOff, Play, Waypoints } from "lucide-react";

import type { TransportState } from "@pipecat-ai/client-js";

import type { AgentDocument } from "../editor/agentDocument";
import { filledTestData, type TestField } from "./testFields";
import { FieldInputs } from "./FieldInputs";
import { GenerateTestData } from "./GenerateTestData";
import { startWebRtcCall } from "./startWebRtcCall";

type TestCallProps = {
    agentId: string | null;
    agent: AgentDocument | null;
    fields: TestField[];
    values: Record<string, string>;
    onValue: (name: string, value: string) => void;
    onOpenTestData: () => void;
    ready: boolean;
    picking: boolean;
    onPicking: (picking: boolean) => void;
    startFromNode: RefObject<(nodeName: string) => void>;
};

export function TestCall({
    agentId,
    agent,
    fields,
    values,
    onValue,
    onOpenTestData,
    ready,
    picking,
    onPicking,
    startFromNode,
}: TestCallProps) {
    const [state, setState] = useState<TransportState | "idle">("idle");
    const [error, setError] = useState<string | null>(null);
    const [playbackBlocked, setPlaybackBlocked] = useState(false);
    const [armed, setArmed] = useState(false);
    const [showFields, setShowFields] = useState(false);
    const disconnectRef = useRef<(() => Promise<void>) | null>(null);
    const starting = useRef(false);
    const generation = useRef(0);
    const live = state === "connected" || state === "ready" || state === "connecting" || state === "authenticating";

    useEffect(() => {
        setState("idle");
        setError(null);
        setPlaybackBlocked(false);
        setArmed(false);
        setShowFields(false);
        onPicking(false);
        return () => {
            generation.current += 1;
            void disconnectRef.current?.();
            disconnectRef.current = null;
        };
    }, [agentId, onPicking]);

    useEffect(() => {
        if (!live) {
            return;
        }
        setArmed(false);
        setShowFields(false);
        onPicking(false);
    }, [live, onPicking]);

    useEffect(() => {
        if (!showFields) {
            return;
        }
        onPicking(ready);
    }, [showFields, ready, onPicking]);

    useEffect(() => {
        startFromNode.current = (nodeName: string) => {
            void begin(nodeName);
        };
    });

    useEffect(() => {
        if (!armed) {
            return;
        }
        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setArmed(false);
                setShowFields(false);
                onPicking(false);
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [armed, onPicking]);

    async function endCall() {
        await disconnectRef.current?.();
        disconnectRef.current = null;
        setState("idle");
        setError(null);
        setPlaybackBlocked(false);
    }

    async function begin(nodeName: string | null) {
        if (starting.current || disconnectRef.current || !agentId || !agent) {
            return;
        }
        starting.current = true;
        const call = generation.current;
        const current = () => generation.current === call;
        setError(null);
        setPlaybackBlocked(false);
        setShowFields(false);
        onPicking(false);
        setState("connecting");
        let ended = false;
        let disconnect: (() => Promise<void>) | null = null;
        try {
            disconnect = await startWebRtcCall(
                agentId,
                agent,
                (next) => {
                    if (current()) {
                        setState(next);
                    }
                },
                () => {
                    if (current()) {
                        setPlaybackBlocked(true);
                    }
                },
                () => {
                    ended = true;
                    if (!current() || disconnectRef.current !== disconnect) {
                        return;
                    }
                    disconnectRef.current = null;
                    setState("idle");
                    setPlaybackBlocked(false);
                },
                nodeName ? { node: nodeName, data: filledTestData(fields, values) } : undefined,
            );
            if (!current()) {
                void disconnect();
                return;
            }
            if (!ended) {
                disconnectRef.current = disconnect;
            }
        } catch (caught) {
            if (!current()) {
                return;
            }
            disconnectRef.current = null;
            setState("idle");
            setArmed(true);
            setError(caught instanceof Error ? caught.message : "Could not start the call.");
        } finally {
            starting.current = false;
        }
    }

    function onMain() {
        if (disconnectRef.current || live) {
            void endCall();
            return;
        }
        if (!armed) {
            setArmed(true);
            return;
        }
        void begin(null);
    }

    function onStartFromNode() {
        if (showFields || picking) {
            setShowFields(false);
            onPicking(false);
            return;
        }
        setShowFields(true);
        onPicking(ready);
    }

    const showChoices = armed && !live;

    const status = callStatus(state, error, playbackBlocked);

    return (
        <div className="call-anchor">
            {showFields && !live && (
                <div className="start-strip">
                    <div className="start-strip-head">
                        <p>{ready ? "Click a step." : "Fill these, then click a step."}</p>
                        {agent ? (
                            <GenerateTestData
                                agent={agent}
                                fields={fields}
                                onValues={(generated) => Object.entries(generated).forEach(([name, value]) => onValue(name, value))}
                            />
                        ) : null}
                    </div>
                    {fields.length > 0 && <FieldInputs fields={fields} values={values} onChange={onValue} />}
                </div>
            )}
            <div className="call-left">
                <button type="button" className="pill" onClick={onOpenTestData}>
                    <ClipboardList className="nav-icon icon-data" aria-hidden="true" />
                    Test data
                </button>
                {showChoices && (
                    <button
                        type="button"
                        className="call-button call-side"
                        aria-pressed={picking}
                        onClick={onStartFromNode}
                    >
                        <Waypoints className="nav-icon icon-call" aria-hidden="true" />
                        Start from node
                    </button>
                )}
            </div>
            <button
                type="button"
                className="call-button"
                onClick={onMain}
                disabled={!agentId || !agent || agent.nodes.length === 0}
            >
                {live ? <PhoneOff className="nav-icon" aria-hidden="true" /> : showChoices ? <Play className="nav-icon icon-call" aria-hidden="true" /> : <Phone className="nav-icon icon-call" aria-hidden="true" />}
                {live ? "End call" : showChoices ? "Start" : "Test call"}
            </button>
            {status && <p className={error ? "call-status error" : "call-status"}>{status}</p>}
        </div>
    );
}

function callStatus(
    state: TransportState | "idle",
    error: string | null,
    playbackBlocked: boolean,
): string {
    if (error) {
        if (/permission|notallowed|denied/i.test(error)) {
            return "Allow the microphone for this page to place a test call.";
        }
        if (/fetch|network|failed to/i.test(error)) {
            return "The voice runner is not reachable. Is `make run` up?";
        }
        return error;
    }
    if (playbackBlocked) {
        return "The browser blocked the agent's voice. Unmute the tab and call again.";
    }
    if (state === "ready" || state === "connected") {
        return "On the call.";
    }
    if (state === "connecting" || state === "authenticating" || state === "initialized") {
        return "Connecting…";
    }
    return "";
}
