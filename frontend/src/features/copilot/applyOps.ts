import type { AgentDocument, AgentEdge, AgentNode, EdgeField } from "../editor/agentDocument";
import type { FunctionTemplate } from "../function-catalog/functionTemplate";
import { isPlainFunction, NO_FUNCTION } from "../graph-edits/plainFunction";
import type { PatchOp } from "./patch";

const NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const ORDER: Record<string, number> = {
    add_function: 0,
    add_node: 1,
    set_persona: 2,
    set_task: 3,
    set_initial: 4,
    set_end: 5,
    add_edge: 6,
    set_edge: 7,
    remove_edge: 8,
    remove_node: 9,
};

/**
 * The canvas preview of a proposal. It must change an agent exactly the way the
 * server does (backend/domain/patch.py); contracts/patch-cases.json holds the
 * cases both test suites run.
 */
export function applyOps(
    document: AgentDocument,
    ops: PatchOp[],
    catalog: FunctionTemplate[],
): { agent: AgentDocument; functions: FunctionTemplate[] } {
    const agent = structuredClone(document);
    const functions = structuredClone(catalog);
    const ordered = [...ops].sort((left, right) => (ORDER[left.op] ?? 50) - (ORDER[right.op] ?? 50));
    for (const op of ordered) {
        applyOne(agent, functions, op);
    }
    return { agent, functions };
}

function applyOne(agent: AgentDocument, functions: FunctionTemplate[], op: PatchOp) {
    if (op.op === "set_persona") {
        agent.persona = text(op.content);
        return;
    }
    if (op.op === "set_task") {
        const node = requireNode(agent, op.node);
        node.task_messages = [{ role: "developer", content: text(op.content) }];
        return;
    }
    if (op.op === "add_node") {
        if (!NAME.test(op.name)) {
            throw new Error(`Invalid step name '${op.name}'.`);
        }
        if (agent.nodes.some((node) => node.name === op.name)) {
            throw new Error(`Step '${op.name}' already exists.`);
        }
        agent.nodes.push({
            name: op.name,
            task_messages: [{ role: "developer", content: text(op.content) }],
            edges: [],
            end: Boolean(op.end),
        });
        if (!agent.initial_node) {
            agent.initial_node = op.name;
        }
        return;
    }
    if (op.op === "remove_node") {
        agent.nodes = agent.nodes.filter((node) => node.name !== op.node);
        for (const node of agent.nodes) {
            node.edges = (node.edges ?? []).filter((edge) => edge.target !== op.node);
        }
        if (agent.initial_node === op.node) {
            agent.initial_node = agent.nodes[0]?.name ?? "";
        }
        return;
    }
    if (op.op === "add_edge") {
        const node = requireNode(agent, op.source);
        requireNode(agent, op.target);
        if (!NAME.test(op.function ?? "")) {
            throw new Error(`Invalid function name '${op.function}'.`);
        }
        const functionName = uniquePlain(node, op.function);
        const template = functions.find((item) => item.name === functionName);
        // A catalog function owns its fields; only a function the catalog lacks carries its own.
        const edge: AgentEdge = {
            function: functionName,
            description: (op.description?.trim() || template?.description || `Continue to ${op.target}.`).trim(),
            target: op.target,
            properties: template ? {} : structuredClone(op.properties ?? {}),
            required: template ? [] : (op.required ?? []).filter((item) => typeof item === "string"),
        };
        node.edges = [...(node.edges ?? []), edge];
        return;
    }
    if (op.op === "remove_edge") {
        const node = requireNode(agent, op.source);
        node.edges = (node.edges ?? []).filter((edge) => edge.function !== op.function);
        return;
    }
    if (op.op === "set_edge") {
        const node = requireNode(agent, op.source);
        const edge = (node.edges ?? []).find((item) => item.function === op.function);
        if (!edge) {
            throw new Error(`Step '${op.source}' has no arrow '${op.function}'.`);
        }
        if (typeof op.description === "string") {
            edge.description = op.description;
        }
        if (op.target !== undefined && op.target !== null) {
            requireNode(agent, op.target);
            edge.target = op.target;
        }
        return;
    }
    if (op.op === "add_function") {
        if (!NAME.test(op.name ?? "")) {
            throw new Error(`Invalid function name '${op.name}'.`);
        }
        const properties = cleanProperties(op.properties ?? {});
        const entry: FunctionTemplate = {
            name: op.name,
            description: text(op.description),
            properties,
            required: (op.required ?? []).filter((item) => typeof item === "string" && item in properties),
        };
        const index = functions.findIndex((item) => item.name === op.name);
        if (index >= 0) {
            functions[index] = entry;
        } else {
            functions.push(entry);
        }
        return;
    }
    if (op.op === "set_initial") {
        requireNode(agent, op.node);
        agent.initial_node = op.node;
        return;
    }
    if (op.op === "set_end") {
        requireNode(agent, op.node).end = Boolean(op.end);
        return;
    }
    throw new Error(`Unknown op '${(op as { op: string }).op}'.`);
}

function text(value: string | undefined): string {
    return typeof value === "string" ? value.trim() : "";
}

/** Every field is a string with a description and optional non-empty choices, as on the server. */
function cleanProperties(raw: Record<string, EdgeField>): Record<string, EdgeField> {
    const properties: Record<string, EdgeField> = {};
    for (const [key, value] of Object.entries(raw)) {
        if (!NAME.test(key) || typeof value !== "object" || value === null) {
            throw new Error(`Invalid field '${key}'.`);
        }
        const field: EdgeField = {
            type: "string",
            description: typeof value.description === "string" ? value.description : "",
        };
        const choices = value.enum;
        if (Array.isArray(choices) && choices.length > 0 && choices.every((choice) => typeof choice === "string" && choice)) {
            field.enum = choices;
        }
        properties[key] = field;
    }
    return properties;
}

function requireNode(agent: AgentDocument, name: string): AgentNode {
    const node = agent.nodes.find((item) => item.name === name);
    if (!node) {
        throw new Error(`Unknown step '${name}'.`);
    }
    return node;
}

function uniquePlain(node: AgentNode, name: string): string {
    const used = new Set((node.edges ?? []).map((edge) => edge.function));
    if (!used.has(name)) {
        return name;
    }
    if (!isPlainFunction(name) && name !== NO_FUNCTION) {
        throw new Error(`Step '${node.name}' already uses '${name}'.`);
    }
    let index = 2;
    while (used.has(`${name}_${index}`)) {
        index += 1;
    }
    return `${name}_${index}`;
}
