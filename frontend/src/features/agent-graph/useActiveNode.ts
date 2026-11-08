import { useEffect, useState } from "react";

import { getActiveNode } from "../../api/activeNode";

const POLL_MS = 500;

export function useActiveNode(agentId: string | null): string | null {
    const [nodeName, setNodeName] = useState<string | null>(null);

    useEffect(() => {
        if (!agentId) {
            setNodeName(null);
            return;
        }
        let cancelled = false;

        async function poll() {
            if (!agentId) {
                return;
            }
            try {
                const next = await getActiveNode(agentId);
                if (!cancelled) {
                    setNodeName(next);
                }
            } catch {
                if (!cancelled) {
                    setNodeName(null);
                }
            }
        }

        void poll();
        const timer = window.setInterval(() => void poll(), POLL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [agentId]);

    return nodeName;
}
