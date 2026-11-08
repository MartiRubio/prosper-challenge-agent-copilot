import type { AgentDocument, AgentEdge } from "../editor/agentDocument";
import type { FunctionTemplate } from "../function-catalog/functionTemplate";
import { isPlainFunction, NO_FUNCTION } from "./plainFunction";

export function functionOptions(
    document: AgentDocument,
    source: string,
    current: string,
    templates: FunctionTemplate[],
): string[] {
    const used = new Set(
        (document.nodes.find((node) => node.name === source)?.edges ?? [])
            .map((edge) => edge.function)
            .filter((name) => name !== current && !isPlainFunction(name)),
    );
    const names = new Set(templates.map((template) => template.name));
    if (!isPlainFunction(current)) {
        names.add(current);
    }
    return [NO_FUNCTION, ...[...names].filter((name) => !used.has(name)).sort()];
}

export function assignEdgeFunction(
    document: AgentDocument,
    source: string,
    functionName: string,
    choice: string,
    templates: FunctionTemplate[] = [],
): AgentDocument {
    const node = document.nodes.find((item) => item.name === source);
    const edge = node?.edges?.find((item) => item.function === functionName);
    if (!node || !edge) {
        return document;
    }
    if (choice === NO_FUNCTION) {
        return assignPlain(document, source, edge);
    }
    if (edge.function === choice) {
        return document;
    }
    const template = templates.find((item) => item.name === choice);
    if (!template) {
        return document;
    }
    const next = structuredClone(document);
    const updated = next.nodes
        .find((item) => item.name === source)
        ?.edges?.find((item) => item.function === functionName);
    if (!updated) {
        return document;
    }
    updated.function = choice;
    updated.description = template.description;
    updated.properties = structuredClone(template.properties ?? {});
    updated.required = [...(template.required ?? [])];
    return next;
}

function assignPlain(document: AgentDocument, source: string, edge: AgentEdge): AgentDocument {
    const empty = Object.keys(edge.properties ?? {}).length === 0 && (edge.required ?? []).length === 0;
    if (isPlainFunction(edge.function) && empty) {
        return document;
    }
    const next = structuredClone(document);
    const updated = next.nodes
        .find((item) => item.name === source)
        ?.edges?.find((item) => item.function === edge.function);
    if (!updated) {
        return document;
    }
    const used = (next.nodes.find((item) => item.name === source)?.edges ?? [])
        .map((item) => item.function)
        .filter((name) => name !== edge.function);
    updated.function = plainName(used);
    updated.description = `Continue to ${updated.target}.`;
    updated.properties = {};
    updated.required = [];
    return next;
}

function plainName(used: string[]): string {
    if (!used.includes(NO_FUNCTION)) {
        return NO_FUNCTION;
    }
    let index = 2;
    while (used.includes(`${NO_FUNCTION}_${index}`)) {
        index += 1;
    }
    return `${NO_FUNCTION}_${index}`;
}
