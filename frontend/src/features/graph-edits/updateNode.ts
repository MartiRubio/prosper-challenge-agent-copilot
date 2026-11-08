import type { AgentDocument, AgentNode } from "../editor/agentDocument";
import { isCallMarker } from "../agent-graph/markers";

function cloneDocument(document: AgentDocument): AgentDocument {
    return structuredClone(document);
}

function nodeByName(document: AgentDocument, nodeName: string): AgentNode | undefined {
    return document.nodes.find((node) => node.name === nodeName);
}

function uniqueName(used: string[], base: string): string {
    if (!used.includes(base)) {
        return base;
    }
    let index = 2;
    while (used.includes(`${base}-${index}`)) {
        index += 1;
    }
    return `${base}-${index}`;
}

export function setTaskContent(
    document: AgentDocument,
    nodeName: string,
    content: string,
): AgentDocument {
    const next = cloneDocument(document);
    const node = nodeByName(next, nodeName);
    if (!node) {
        return document;
    }
    if (!node.task_messages || node.task_messages.length === 0) {
        node.task_messages = [{ role: "developer", content }];
        return next;
    }
    node.task_messages[0] = { ...node.task_messages[0], content };
    return next;
}

export function renameNode(document: AgentDocument, from: string, to: string): AgentDocument {
    const name = to.trim();
    if (!name || name === from || isCallMarker(name) || document.nodes.some((node) => node.name === name)) {
        return document;
    }
    const next = cloneDocument(document);
    const node = nodeByName(next, from);
    if (!node) {
        return document;
    }
    node.name = name;
    if (next.initial_node === from) {
        next.initial_node = name;
    }
    for (const item of next.nodes) {
        for (const edge of item.edges ?? []) {
            if (edge.target === from) {
                edge.target = name;
            }
        }
    }
    if (next.layout?.[from]) {
        next.layout[name] = next.layout[from];
        delete next.layout[from];
    }
    return next;
}

export function addNode(document: AgentDocument): AgentDocument {
    const next = cloneDocument(document);
    const name = uniqueName(
        next.nodes.map((node) => node.name),
        "step",
    );
    next.nodes.push({
        name,
        task_messages: [{ role: "developer", content: "Say what this step should do." }],
        edges: [],
    });
    return next;
}

export function removeNode(document: AgentDocument, nodeName: string): AgentDocument {
    if (document.nodes.length <= 1) {
        return document;
    }
    const next = cloneDocument(document);
    next.nodes = next.nodes.filter((node) => node.name !== nodeName);
    for (const node of next.nodes) {
        node.edges = (node.edges ?? []).filter((edge) => edge.target !== nodeName);
    }
    if (next.initial_node === nodeName) {
        next.initial_node = next.nodes[0].name;
    }
    if (next.layout) {
        delete next.layout[nodeName];
    }
    return next;
}
