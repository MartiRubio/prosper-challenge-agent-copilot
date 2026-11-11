import { useEffect, useState } from "react";

type Jump = (nodeName: string, data: Record<string, string>) => void;

let activeNode: string | null = null;
let callLive = false;
const listeners = new Set<() => void>();

function emit() {
    for (const listener of listeners) {
        listener();
    }
}

export function publishCallNode(nodeName: string | null) {
    if (activeNode === nodeName) {
        return;
    }
    activeNode = nodeName;
    emit();
}

export function bindCallJump(jump: Jump | null) {
    callLive = jump !== null;
    if (!jump) {
        activeNode = null;
    }
    emit();
}

export function useCallChannel() {
    const [, setVersion] = useState(0);
    useEffect(() => {
        const listener = () => setVersion((version) => version + 1);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, []);
    return { activeNode, callLive };
}
