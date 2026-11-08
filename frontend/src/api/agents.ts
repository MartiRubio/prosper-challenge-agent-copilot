import type { AgentDocument, AgentSummary } from "../features/editor/agentDocument";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function listAgents(): Promise<AgentSummary[]> {
    const response = await fetch(`${API_URL}/agents`);
    if (!response.ok) {
        throw new Error("Could not list agents.");
    }
    return response.json() as Promise<AgentSummary[]>;
}

export async function getAgent(agentId: string): Promise<AgentDocument> {
    const response = await fetch(`${API_URL}/agents/${encodeURIComponent(agentId)}`);
    if (!response.ok) {
        throw new Error(`Could not load agent ${agentId}.`);
    }
    return response.json() as Promise<AgentDocument>;
}

export async function saveAgent(agentId: string, document: AgentDocument): Promise<AgentDocument> {
    const response = await fetch(`${API_URL}/agents/${encodeURIComponent(agentId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(document),
    });
    if (!response.ok) {
        throw new Error(await errorDetail(response));
    }
    return response.json() as Promise<AgentDocument>;
}

async function errorDetail(response: Response): Promise<string> {
    try {
        const body = (await response.json()) as { detail?: unknown };
        if (typeof body.detail === "string" && body.detail) {
            return body.detail;
        }
    } catch {
        // The body was not JSON.
    }
    return "Could not save the agent.";
}
