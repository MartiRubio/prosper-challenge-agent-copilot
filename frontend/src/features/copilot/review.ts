import type { AgentDocument } from "../editor/agentDocument";
import type { FunctionTemplate } from "../function-catalog/functionTemplate";
import type { ReviewMarks } from "../agent-graph/syncFlow";
import { applyOps } from "./applyOps";
import type { PatchOp, ReviewChange } from "./patch";

export function pendingOps(changes: ReviewChange[]): PatchOp[] {
    return changes.filter((change) => change.status === "pending").flatMap((change) => change.ops);
}

export function previewDocument(
    document: AgentDocument,
    changes: ReviewChange[],
    functions: FunctionTemplate[],
): AgentDocument {
    const visible = pendingOps(changes).filter((op) => {
        if (op.op === "remove_node" || op.op === "remove_edge") {
            return false;
        }
        if (op.op === "set_end" && !op.end) {
            return false;
        }
        return true;
    });
    if (visible.length === 0) {
        return document;
    }
    try {
        return applyOps(document, visible, functions).agent;
    } catch {
        return document;
    }
}

export function reviewMarks(changes: ReviewChange[], hot: string[]): ReviewMarks {
    const nodes: ReviewMarks["nodes"] = {};
    const edges: ReviewMarks["edges"] = {};
    for (const change of changes) {
        if (change.status !== "pending") {
            continue;
        }
        for (const op of change.ops) {
            if (op.op === "add_node") {
                nodes[op.name] = "add";
            } else if (op.op === "remove_node") {
                nodes[op.node] = "remove";
            } else if (op.op === "set_task" || op.op === "set_initial") {
                nodes[op.node] = nodes[op.node] ?? "change";
            } else if (op.op === "add_edge") {
                edges[`${op.source}:${op.function}`] = "add";
            } else if (op.op === "remove_edge") {
                edges[`${op.source}:${op.function}`] = "remove";
            } else if (op.op === "set_edge") {
                edges[`${op.source}:${op.function}`] = "change";
            } else if (op.op === "set_end") {
                edges[`${op.node}:end`] = op.end ? "add" : "remove";
            }
        }
    }
    return { nodes, edges, hot };
}

export function blockReason(change: ReviewChange, document: AgentDocument, changes: ReviewChange[]): string | null {
    if (change.status !== "pending") {
        return null;
    }
    const discarded = new Set<string>();
    const pending = new Set<string>();
    for (const other of changes) {
        if (other.id === change.id) {
            continue;
        }
        for (const op of other.ops) {
            if (op.op !== "add_node") {
                continue;
            }
            if (other.status === "discarded") {
                discarded.add(op.name);
            }
            if (other.status === "pending") {
                pending.add(op.name);
            }
        }
    }
    const createdHere = new Set(
        change.ops.flatMap((op) => (op.op === "add_node" ? [op.name] : [])),
    );
    for (const op of change.ops) {
        const target = op.op === "add_edge" || op.op === "set_edge"
            ? op.target
            : op.op === "set_initial"
                ? op.node
                : null;
        if (!target) {
            continue;
        }
        if (document.nodes.some((node) => node.name === target) || createdHere.has(target)) {
            continue;
        }
        if (discarded.has(target)) {
            return `Needs step ${target}, which was discarded.`;
        }
        if (pending.has(target)) {
            return `Keep the new step ${target} first.`;
        }
        return `Needs step ${target}.`;
    }
    return null;
}

export function touchedNodes(change: ReviewChange): string[] {
    const names = new Set<string>();
    for (const op of change.ops) {
        if (op.op === "add_node") {
            names.add(op.name);
        }
        if (op.op === "set_task" || op.op === "remove_node" || op.op === "set_initial" || op.op === "set_end") {
            names.add(op.node);
        }
        if (op.op === "add_edge" || op.op === "remove_edge" || op.op === "set_edge") {
            names.add(op.source);
            if ("target" in op && op.target) {
                names.add(op.target);
            }
        }
    }
    return [...names];
}

export function newFunctions(change: ReviewChange): { name: string; fields: string }[] {
    return change.ops.flatMap((op) => {
        if (op.op !== "add_function") {
            return [];
        }
        const fields = Object.keys(op.properties ?? {});
        return [{ name: op.name, fields: fields.join(", ") }];
    });
}

export function previewFunctions(
    functions: FunctionTemplate[],
    changes: ReviewChange[],
): FunctionTemplate[] {
    const visible = pendingOps(changes).filter((op) => op.op === "add_function");
    if (visible.length === 0) {
        return functions;
    }
    const next = structuredClone(functions);
    for (const op of visible) {
        if (op.op !== "add_function") {
            continue;
        }
        const entry: FunctionTemplate = {
            name: op.name,
            description: op.description ?? "",
            properties: structuredClone(op.properties ?? {}),
            required: [...(op.required ?? [])],
        };
        const index = next.findIndex((item) => item.name === op.name);
        if (index >= 0) {
            next[index] = entry;
        } else {
            next.push(entry);
        }
    }
    return next;
}

export function taskPairs(document: AgentDocument, change: ReviewChange): { current: string; next: string }[] {
    return change.ops.flatMap((op) => {
        if (op.op !== "set_task") {
            return [];
        }
        const node = document.nodes.find((item) => item.name === op.node);
        return [{
            current: node?.task_messages?.[0]?.content ?? "",
            next: op.content,
        }];
    });
}
