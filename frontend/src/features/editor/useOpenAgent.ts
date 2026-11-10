import { useCallback, useEffect, useRef, useState } from "react";

import { createAgent, deleteAgent, getAgent, listAgents, saveAgent } from "../../api/agents";
import type { AgentDocument, AgentSummary } from "./agentDocument";

export function useOpenAgent() {
    const [agents, setAgents] = useState<AgentSummary[]>([]);
    const [agentId, setAgentId] = useState<string | null>(null);
    const [document, setDocument] = useState<AgentDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const documentRef = useRef(document);
    const dirtyRef = useRef(dirty);
    documentRef.current = document;
    dirtyRef.current = dirty;

    const openAgent = useCallback(async (id: string) => {
        if (dirtyRef.current && !window.confirm("This agent has unsaved changes. Leave without saving?")) {
            return;
        }
        setError(null);
        try {
            const next = await getAgent(id);
            setAgentId(id);
            setDocument(next);
            setDirty(false);
        } catch (caught) {
            setDocument(null);
            setDirty(false);
            setError(caught instanceof Error ? caught.message : "Could not load the agent.");
        }
    }, []);

    const editDocument = useCallback((next: AgentDocument) => {
        if (next === documentRef.current) {
            return;
        }
        setDocument(next);
        setDirty(true);
    }, []);

    const renameOpenAgent = useCallback((name: string) => {
        const current = documentRef.current;
        const trimmed = name.trim();
        if (!current || !agentId || !trimmed || trimmed === current.name) {
            return;
        }
        setDocument({ ...current, name: trimmed });
        setAgents((list) => list.map((agent) => (
            agent.id === agentId ? { ...agent, name: trimmed } : agent
        )));
        setDirty(true);
    }, [agentId]);

    const setPersona = useCallback((persona: string) => {
        const current = documentRef.current;
        if (!current || persona === (current.persona ?? "")) {
            return;
        }
        setDocument({ ...current, persona });
        setDirty(true);
    }, []);

    const removeAgent = useCallback(async (id: string) => {
        const name = agents.find((agent) => agent.id === id)?.name ?? "this agent";
        if (!window.confirm(`Delete ${name}?`)) {
            return;
        }
        setError(null);
        const rest = agents.filter((agent) => agent.id !== id);
        try {
            await deleteAgent(id);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not delete the agent.");
            return;
        }
        setAgents(rest);
        if (agentId !== id) {
            return;
        }
        dirtyRef.current = false;
        const next = rest[0];
        if (!next) {
            setAgentId(null);
            setDocument(null);
            setDirty(false);
            return;
        }
        await openAgent(next.id);
    }, [agentId, agents, openAgent]);

    const createNewAgent = useCallback(async () => {
        if (dirtyRef.current && !window.confirm("This agent has unsaved changes. Leave without saving?")) {
            return;
        }
        setError(null);
        try {
            const created = await createAgent();
            setAgents((current) =>
                [...current, { id: created.id, name: created.agent.name }].sort((a, b) =>
                    a.id.localeCompare(b.id),
                ),
            );
            setAgentId(created.id);
            setDocument(created.agent);
            setDirty(false);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Could not create the agent.");
        }
    }, []);

    const save = useCallback(async () => {
        if (!agentId || !document) {
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const saved = await saveAgent(agentId, document);
            setDocument(saved);
            setAgents((current) => current.map((agent) => (
                agent.id === agentId ? { ...agent, name: saved.name } : agent
            )));
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
        loading,
        saving,
        dirty,
        error,
        setError,
        openAgent,
        createNewAgent,
        removeAgent,
        save,
        editDocument,
        renameOpenAgent,
        setPersona,
    };
}
