import type { AgentDocument } from "../features/editor/agentDocument";
import type { FunctionTemplate } from "../features/function-catalog/functionTemplate";
import type { FocusChip } from "../features/copilot/focus";
import type { PatchOp, ProposedChange } from "../features/copilot/patch";
import { jsonBody, requestJson } from "./http";

export type CallTurn = {
    role: "agent" | "caller";
    text: string;
    step?: string;
};

export type CallCheck = {
    status: "ok" | "issue";
    severity: "low" | "medium" | "high";
    issue: string;
    step: string;
    quote: string;
    feedback: string;
    checked_at: string;
};

export type LoggedCall = {
    id: string;
    agent_id: string;
    title: string;
    started_at: string;
    source: "production" | "test" | "sample";
    turns: CallTurn[];
    check: CallCheck | null;
    /** Set when a test call opened on a later step instead of Start. */
    start_node?: string;
    test_data?: Record<string, string>;
};

export type FlaggedCall = {
    id: string;
    agent_id: string;
    title: string;
    feedback: string;
    turns: CallTurn[];
    check?: CallCheck | null;
};

export type Attachment = {
    name: string;
    text: string;
    truncated: boolean;
    characters: number;
};

export type CoverageRule = {
    rule: string;
    /** The change that implements it, "existing", or "" when nothing does. */
    covered_by: string;
};

export type Proposal = {
    summary: string;
    changes: ProposedChange[];
    coverage: CoverageRule[];
    warnings: string[];
};

export type ReplayRun = {
    passed: boolean;
    reason: string;
    transcript: CallTurn[];
    path: string[];
    ended: "agent" | "caller" | "turn_limit" | "no_start";
};

export type ReplayResult = {
    call_id: string;
    title: string;
    brief: { goal?: string };
    before: ReplayRun;
    after: ReplayRun;
};

export function proposeChanges(input: {
    agentId: string;
    agent: AgentDocument;
    catalog: FunctionTemplate[];
    message: string;
    focus: FocusChip[];
    calls: FlaggedCall[];
    attachments: Attachment[];
}): Promise<Proposal> {
    return requestJson("/copilot/edit", "The copilot could not read that.", jsonBody("POST", {
        agent_id: input.agentId,
        agent: input.agent,
        catalog: input.catalog,
        message: input.message,
        focus: input.focus,
        calls: input.calls,
        attachments: input.attachments.map(({ name, text }) => ({ name, text })),
    }));
}

export async function rewriteTask(agent: AgentDocument, node: string, content: string, message: string): Promise<string> {
    const body = await requestJson<{ content?: unknown }>(
        "/copilot/rewrite",
        "The step could not be rewritten.",
        jsonBody("POST", { agent, node, content, message }),
    );
    if (typeof body.content !== "string" || !body.content.trim()) {
        throw new Error("The rewrite was empty.");
    }
    return body.content;
}

export async function rewritePersona(agent: AgentDocument, message: string): Promise<string> {
    const body = await requestJson<{ content?: unknown }>(
        "/copilot/rewrite",
        "The persona could not be rewritten.",
        jsonBody("POST", { agent, target: "persona", content: agent.persona ?? "", message }),
    );
    if (typeof body.content !== "string" || !body.content.trim()) {
        throw new Error("The rewrite was empty.");
    }
    return body.content;
}

export async function generateTestData(
    agent: AgentDocument,
    fields: { name: string; label: string; options: string[] | null }[],
): Promise<Record<string, string>> {
    const body = await requestJson<{ values?: Record<string, string> }>(
        "/copilot/test-data",
        "Could not make up test data.",
        jsonBody("POST", {
            agent,
            fields: fields.map((field) => ({ name: field.name, description: field.label, options: field.options })),
        }),
    );
    return body.values ?? {};
}

export function applyOpsOnServer(
    agent: AgentDocument,
    ops: PatchOp[],
    catalog: FunctionTemplate[],
): Promise<{ agent: AgentDocument; functions: FunctionTemplate[] }> {
    return requestJson("/copilot/apply", "That change could not be applied.", jsonBody("POST", { agent, ops, catalog }));
}

export function listCalls(agentId: string): Promise<LoggedCall[]> {
    return requestJson(`/copilot/calls?agent_id=${encodeURIComponent(agentId)}`, "Could not load the call log.");
}

export function checkCall(agentId: string, callId: string): Promise<CallCheck> {
    return requestJson(
        `/copilot/calls/${encodeURIComponent(agentId)}/${encodeURIComponent(callId)}/check`,
        "Could not check that call.",
        { method: "POST" },
    );
}

export function replayCalls(input: {
    before: AgentDocument;
    after: AgentDocument;
    calls: FlaggedCall[];
    catalog: FunctionTemplate[];
}): Promise<ReplayResult[]> {
    return requestJson("/copilot/replay", "The replay could not run.", jsonBody("POST", {
        agent_before: input.before,
        agent_after: input.after,
        calls: input.calls,
        catalog: input.catalog,
    }));
}

export async function readAttachment(file: File): Promise<Attachment> {
    const data = await toBase64(file);
    return requestJson("/copilot/attachment", "That file could not be read.", jsonBody("POST", { name: file.name, data }));
}

function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result ?? "");
            resolve(result.slice(result.indexOf(",") + 1));
        };
        reader.onerror = () => reject(new Error("That file could not be read."));
        reader.readAsDataURL(file);
    });
}
