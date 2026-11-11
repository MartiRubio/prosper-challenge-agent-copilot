import type { AgentDocument, AgentSummary } from "../features/editor/agentDocument";
import { jsonBody, requestJson } from "./http";

export type AgentVersion = {
    id: string;
    saved_at: string;
    name: string;
    steps: number;
};

const agentPath = (agentId: string) => `/agents/${encodeURIComponent(agentId)}`;

export function listAgents(): Promise<AgentSummary[]> {
    return requestJson("/agents", "Could not list agents.");
}

export function getAgent(agentId: string): Promise<AgentDocument> {
    return requestJson(agentPath(agentId), `Could not load agent ${agentId}.`);
}

export function createAgent(name?: string): Promise<{ id: string; agent: AgentDocument }> {
    return requestJson("/agents", "Could not create the agent.", jsonBody("POST", name ? { name } : {}));
}

export async function deleteAgent(agentId: string): Promise<void> {
    await requestJson(agentPath(agentId), "Could not delete the agent.", { method: "DELETE" });
}

export function saveAgent(agentId: string, document: AgentDocument): Promise<AgentDocument> {
    return requestJson(agentPath(agentId), "Could not save the agent.", jsonBody("PUT", document));
}

export function listVersions(agentId: string): Promise<AgentVersion[]> {
    return requestJson(`${agentPath(agentId)}/versions`, "Could not load the saved versions.");
}

export function getVersion(agentId: string, versionId: string): Promise<AgentDocument> {
    return requestJson(
        `${agentPath(agentId)}/versions/${encodeURIComponent(versionId)}`,
        "Could not load that version.",
    );
}
