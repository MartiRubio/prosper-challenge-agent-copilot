import type { AgentDocument } from "../editor/agentDocument";
import type { FunctionTemplate } from "../function-catalog/functionTemplate";
import type { ReviewMarks } from "../agent-graph/syncFlow";
import { applyOps } from "./applyOps";
import type { PatchOp } from "./patch";
import type { ReviewChange } from "./reviewChange";

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

/** Why a card cannot be kept yet. Cards in `batch` are kept together, so their new steps count as present. */
export function blockReason(
    change: ReviewChange,
    document: AgentDocument,
    changes: ReviewChange[],
    batch: ReadonlySet<string> = new Set(),
): string | null {
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
        changes
            .filter((other) => other.id === change.id || (batch.has(other.id) && other.status === "pending"))
            .flatMap((other) => other.ops.flatMap((op) => (op.op === "add_node" ? [op.name] : []))),
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
            continue;
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
            if (op.op !== "remove_edge" && op.target) {
                names.add(op.target);
            }
        }
    }
    return [...names];
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

/** Steps a change points at, whether it adds them or not. */
function namedSteps(change: ReviewChange): Set<string> {
    const names = new Set<string>();
    for (const op of change.ops) {
        if (op.op === "add_edge" || op.op === "set_edge") {
            names.add(op.source);
            if (op.target) {
                names.add(op.target);
            }
        } else if (op.op === "remove_edge") {
            names.add(op.source);
        } else if (op.op === "set_task" || op.op === "set_initial" || op.op === "set_end" || op.op === "remove_node") {
            names.add(op.node);
        }
    }
    return names;
}

function addedSteps(change: ReviewChange): Set<string> {
    return new Set(change.ops.flatMap((op) => (op.op === "add_node" ? [op.name] : [])));
}

/** Pending changes that add a step this change needs, and theirs in turn. */
export function dependencies(change: ReviewChange, document: AgentDocument, changes: ReviewChange[]): ReviewChange[] {
    const existing = new Set(document.nodes.map((node) => node.name));
    const found = new Map<string, ReviewChange>();
    const visit = (current: ReviewChange) => {
        const own = addedSteps(current);
        for (const step of namedSteps(current)) {
            if (existing.has(step) || own.has(step)) {
                continue;
            }
            const provider = changes.find((other) => other.status === "pending" && other.id !== change.id && addedSteps(other).has(step));
            if (provider && !found.has(provider.id)) {
                found.set(provider.id, provider);
                visit(provider);
            }
        }
    };
    visit(change);
    return [...found.values()];
}

/** Pending changes in an order where every step is added before a change uses it. */
export function reviewOrder(document: AgentDocument, changes: ReviewChange[]): ReviewChange[] {
    const pending = changes.filter((change) => change.status === "pending");
    const placed: ReviewChange[] = [];
    const seen = new Set<string>();
    const place = (change: ReviewChange) => {
        if (seen.has(change.id)) {
            return;
        }
        seen.add(change.id);
        for (const dependency of dependencies(change, document, changes)) {
            place(dependency);
        }
        placed.push(change);
    };
    pending.forEach(place);
    return placed;
}
