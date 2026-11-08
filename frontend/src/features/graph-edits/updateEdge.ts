import type { AgentDocument, AgentEdge, AgentNode } from "../editor/agentDocument";

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

function withEdge(
    document: AgentDocument,
    nodeName: string,
    functionName: string,
    update: (edge: AgentEdge) => void,
): AgentDocument {
    const next = cloneDocument(document);
    const edge = nodeByName(next, nodeName)?.edges?.find((item) => item.function === functionName);
    if (!edge) {
        return document;
    }
    update(edge);
    return next;
}

export function addEdge(document: AgentDocument, nodeName: string): AgentDocument {
    const next = cloneDocument(document);
    const node = nodeByName(next, nodeName);
    if (!node) {
        return document;
    }
    const edges = node.edges ?? [];
    node.edges = edges;
    const target = next.nodes.find((item) => item.name !== nodeName)?.name ?? nodeName;
    edges.push({
        function: uniqueName(
            edges.map((edge) => edge.function),
            "continue",
        ),
        description: "When the caller should take this path.",
        target,
        properties: {},
        required: [],
    });
    return next;
}

export function removeEdge(
    document: AgentDocument,
    nodeName: string,
    functionName: string,
): AgentDocument {
    const next = cloneDocument(document);
    const node = nodeByName(next, nodeName);
    if (!node) {
        return document;
    }
    node.edges = (node.edges ?? []).filter((edge) => edge.function !== functionName);
    return next;
}

export function setEdgeDescription(
    document: AgentDocument,
    nodeName: string,
    functionName: string,
    description: string,
): AgentDocument {
    return withEdge(document, nodeName, functionName, (edge) => {
        edge.description = description;
    });
}

export function setEdgeTarget(
    document: AgentDocument,
    nodeName: string,
    functionName: string,
    target: string,
): AgentDocument {
    if (!document.nodes.some((node) => node.name === target)) {
        return document;
    }
    return withEdge(document, nodeName, functionName, (edge) => {
        edge.target = target;
    });
}

export function renameEdgeFunction(
    document: AgentDocument,
    nodeName: string,
    functionName: string,
    nextFunction: string,
): AgentDocument {
    const name = nextFunction.trim();
    const node = nodeByName(document, nodeName);
    if (!name || name === functionName || !node) {
        return document;
    }
    if ((node.edges ?? []).some((edge) => edge.function === name)) {
        return document;
    }
    return withEdge(document, nodeName, functionName, (edge) => {
        edge.function = name;
    });
}

export function addCollectedField(
    document: AgentDocument,
    nodeName: string,
    functionName: string,
): AgentDocument {
    return withEdge(document, nodeName, functionName, (edge) => {
        const properties = edge.properties ?? {};
        edge.properties = properties;
        const name = uniqueName(Object.keys(properties), "detail");
        properties[name] = { type: "string", description: "" };
    });
}

export function removeCollectedField(
    document: AgentDocument,
    nodeName: string,
    functionName: string,
    fieldName: string,
): AgentDocument {
    return withEdge(document, nodeName, functionName, (edge) => {
        if (edge.properties) {
            delete edge.properties[fieldName];
        }
        edge.required = (edge.required ?? []).filter((name) => name !== fieldName);
    });
}

type CollectedFieldPatch = {
    name?: string;
    type?: string;
    description?: string;
    required?: boolean;
};

export function updateCollectedField(
    document: AgentDocument,
    nodeName: string,
    functionName: string,
    fieldName: string,
    patch: CollectedFieldPatch,
): AgentDocument {
    return withEdge(document, nodeName, functionName, (edge) => {
        const properties = edge.properties ?? {};
        const current = properties[fieldName];
        if (!current) {
            return;
        }
        const nextName = patch.name === undefined ? fieldName : patch.name.trim();
        if (!nextName || (nextName !== fieldName && properties[nextName])) {
            return;
        }
        const updated = { ...properties };
        delete updated[fieldName];
        const field = { ...current };
        if (patch.type !== undefined) {
            field.type = patch.type;
        }
        if (patch.description !== undefined) {
            field.description = patch.description;
        }
        updated[nextName] = field;
        edge.properties = updated;
        const required = new Set(edge.required ?? []);
        if (patch.required === true) {
            required.add(nextName);
        } else if (patch.required === false) {
            required.delete(fieldName);
            required.delete(nextName);
        } else if (nextName !== fieldName && required.has(fieldName)) {
            required.delete(fieldName);
            required.add(nextName);
        }
        edge.required = [...required];
    });
}
