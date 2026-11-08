import { useCallback, useEffect, useState } from "react";

import { getAgent, listAgents } from "../../api/agents";
import type { AgentDocument, AgentSummary } from "./agentDocument";

export function useOpenAgent() {
    const [agents, setAgents] = useState<AgentSummary[]>([]);
    const [agentId, setAgentId] = useState<string | null>(null);
    const [document, setDocument] = useState<AgentDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const openAgent = useCallback(async (id: string) => {
        setError(null);
        setAgentId(id);
        try {
            setDocument(await getAgent(id));
        } catch (caught) {
            setDocument(null);
            setError(caught instanceof Error ? caught.message : "Could not load the agent.");
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        listAgents()
            .then(async (found) => {
                if (cancelled) {
                    return;
                }
                setAgents(found);
                if (found.length === 0) {
                    setLoading(false);
                    return;
                }
                const next = await getAgent(found[0].id);
                if (cancelled) {
                    return;
                }
                setAgentId(found[0].id);
                setDocument(next);
                setLoading(false);
            })
            .catch((caught: unknown) => {
                if (cancelled) {
                    return;
                }
                setError(caught instanceof Error ? caught.message : "Could not load agents.");
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return { agents, agentId, document, loading, error, openAgent };
}
