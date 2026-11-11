import { useEffect, useState } from "react";

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

export function setCallLive(live: boolean) {
    callLive = live;
    if (!live) {
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
