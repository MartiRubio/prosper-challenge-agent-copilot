import type { AgentDocument } from "../features/editor/agentDocument";
import type { FunctionTemplate } from "../features/function-catalog/functionTemplate";
import type { FocusChip } from "../features/copilot/focus";
import type { PatchOp, ProposedChange } from "../features/copilot/patch";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export type CallTurn = {
    role: "agent" | "caller";
    text: string;
};

export type LoggedCall = {
    id: string;
    agent_id: string;
    title: string;
    started_at: string;
    turns: CallTurn[];
};

export type FlaggedCall = {
    id: string;
    agent_id: string;
    title: string;
    feedback: string;
    turns: CallTurn[];
};

export async function editAgent(input: {
    agentId: string;
    agent: AgentDocument;
    catalog: FunctionTemplate[];
    message: string;
    focus: FocusChip[];
    calls: FlaggedCall[];
}): Promise<{ summary: string; changes: ProposedChange[] }> {
    const response = await fetch(`${API_URL}/copilot/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            agent_id: input.agentId,
            agent: input.agent,
            catalog: input.catalog,
            message: input.message,
            focus: input.focus,
            calls: input.calls,
        }),
    });
    if (!response.ok) {
        throw new Error(await errorDetail(response, "The copilot could not read that."));
    }
    return response.json() as Promise<{ summary: string; changes: ProposedChange[] }>;
}

export async function rewriteTask(agent: AgentDocument, node: string, content: string, message: string): Promise<string> {
    const response = await fetch(`${API_URL}/copilot/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent, node, content, message }),
    });
    if (!response.ok) {
        throw new Error(await errorDetail(response, "The step could not be rewritten."));
    }
    const body = await response.json() as { content?: unknown };
    if (typeof body.content !== "string" || !body.content.trim()) {
        throw new Error("The rewrite was empty.");
    }
    return body.content;
}

export async function applyChanges(
    agent: AgentDocument,
    ops: PatchOp[],
    catalog: FunctionTemplate[],
): Promise<{ agent: AgentDocument; functions: FunctionTemplate[] }> {
    const response = await fetch(`${API_URL}/copilot/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent, ops, catalog }),
    });
    if (!response.ok) {
        throw new Error(await errorDetail(response, "That change could not be applied."));
    }
    return response.json() as Promise<{ agent: AgentDocument; functions: FunctionTemplate[] }>;
}

export async function listCalls(agentId: string): Promise<LoggedCall[]> {
    const response = await fetch(`${API_URL}/copilot/calls?agent_id=${encodeURIComponent(agentId)}`);
    if (!response.ok) {
        throw new Error("Could not load the call log.");
    }
    return response.json() as Promise<LoggedCall[]>;
}

async function errorDetail(response: Response, fallback: string): Promise<string> {
    try {
        const body = (await response.json()) as { detail?: unknown };
        if (typeof body.detail === "string" && body.detail) {
            return body.detail;
        }
    } catch {
        // The body was not JSON.
    }
    return fallback;
}
