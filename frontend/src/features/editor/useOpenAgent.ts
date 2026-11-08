import { useCallback, useEffect, useState } from "react";

import { getAgent, listAgents, saveAgent } from "../../api/agents";
import type { AgentDocument, AgentSummary } from "./agentDocument";

export function useOpenAgent() {
    const [agents, setAgents] = useState<AgentSummary[]>([]);
    const [agentId, setAgentId] = useState<string | null>(null);
    const [document, setDocument] = useState<AgentDocument | null>(null);
    const [selectedNodeName, setSelectedNodeName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const openAgent = useCallback(async (id: string) => {
        setError(null);
        setAgentId(id);
        try {
            const next = await getAgent(id);
            setDocument(next);
            setSelectedNodeName(next.initial_node);
            setDirty(false);
        } catch (caught) {
            setDocument(null);
            setSelectedNodeName(null);
            setDirty(false);
            setError(caught instanceof Error ? caught.message : "Could not load the agent.");
        }
    }, []);

    const editDocument = useCallback((next: AgentDocument) => {
        setDocument(next);
        setDirty(true);
    }, []);

    const save = useCallback(async () => {
        if (!agentId || !document) {
            return;
        }
        setSaving(true);
        setError(null);
        try {
            setDocument(await saveAgent(agentId, document));
            setDirty(false);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not save the agent.");
        } finally {
            setSaving(false);
        }
    }, [agentId, document]);

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
                setSelectedNodeName(next.initial_node);
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

    return {
        agents,
        agentId,
        document,
        selectedNodeName,
        loading,
        saving,
        dirty,
        error,
        openAgent,
        save,
        selectNode: setSelectedNodeName,
        editDocument,
    };
}
