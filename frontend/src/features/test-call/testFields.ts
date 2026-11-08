import type { AgentDocument } from "../editor/agentDocument";
import type { FunctionTemplate } from "../function-catalog/functionTemplate";
import { isPlainFunction } from "../graph-edits/plainFunction";

export type TestField = {
    name: string;
    label: string;
    options: string[] | null;
};

export function testFields(document: AgentDocument, functions: FunctionTemplate[]): TestField[] {
    const byName = new Map(functions.map((fn) => [fn.name, fn]));
    const fields = new Map<string, TestField>();
    for (const node of document.nodes) {
        for (const edge of node.edges ?? []) {
            if (isPlainFunction(edge.function)) {
                continue;
            }
            const properties = byName.get(edge.function)?.properties ?? edge.properties ?? {};
            for (const [name, schema] of Object.entries(properties)) {
                if (fields.has(name)) {
                    continue;
                }
                fields.set(name, {
                    name,
                    label: schema.description || name,
                    options: schema.enum && schema.enum.length > 0 ? schema.enum : null,
                });
            }
        }
    }
    return [...fields.values()];
}

export function testDataReady(fields: TestField[], values: Record<string, string>): boolean {
    return fields.every((field) => (values[field.name] ?? "").trim().length > 0);
}

export function filledTestData(fields: TestField[], values: Record<string, string>): Record<string, string> {
    const data: Record<string, string> = {};
    for (const field of fields) {
        data[field.name] = (values[field.name] ?? "").trim();
    }
    return data;
}
