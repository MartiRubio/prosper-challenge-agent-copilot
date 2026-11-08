import type { AgentDocument } from "../editor/agentDocument";
import { END_ID, START_ID } from "../agent-graph/markers";
import { NO_FUNCTION } from "./plainFunction";

export function canConnect(document: AgentDocument, source: string | null, target: string | null): boolean {
    if (!source || !target || source === target || source === END_ID || target === START_ID) {
        return false;
    }
    if (source === START_ID) {
        return target !== document.initial_node && document.nodes.some((node) => node.name === target);
    }
    if (target === END_ID) {
        const node = document.nodes.find((item) => item.name === source);
        return Boolean(node && !node.end);
    }
    return document.nodes.some((node) => node.name === source) && document.nodes.some((node) => node.name === target);
}

export function connectNodes(document: AgentDocument, source: string, target: string): AgentDocument {
    if (!canConnect(document, source, target)) {
        return document;
    }
    const next = structuredClone(document);
    if (source === START_ID) {
        next.initial_node = target;
        return next;
    }
    if (target === END_ID) {
        const node = next.nodes.find((item) => item.name === source);
        if (!node) {
            return document;
        }
        node.end = true;
        return next;
    }
    const node = next.nodes.find((item) => item.name === source);
    if (!node) {
        return document;
    }
    const edges = node.edges ?? [];
    node.edges = edges;
    const used = edges.map((edge) => edge.function);
    edges.push({
        function: uniqueName(used, NO_FUNCTION),
        description: `Continue to ${target}.`,
        target,
        properties: {},
        required: [],
    });
    return next;
}

function uniqueName(used: string[], base: string): string {
    if (!used.includes(base)) {
        return base;
    }
    let index = 2;
    while (used.includes(`${base}_${index}`)) {
        index += 1;
    }
    return `${base}_${index}`;
}
