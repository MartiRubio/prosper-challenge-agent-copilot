import type { AgentDocument } from "../editor/agentDocument";
import type { ReviewChange } from "./reviewChange";

export type ChangeLine = {
    kind: "add" | "change" | "remove";
    label: string;
    before?: string;
    after?: string;
};

/** One readable line per op, so a reviewer sees every effect of a card, not only its title. */
export function describeChange(document: AgentDocument, change: ReviewChange): ChangeLine[] {
    const taskOf = (name: string) => document.nodes.find((node) => node.name === name)?.task_messages?.[0]?.content ?? "";
    const edgeOf = (source: string, fn: string) =>
        document.nodes.find((node) => node.name === source)?.edges?.find((edge) => edge.function === fn);
    return change.ops.map((op): ChangeLine => {
        switch (op.op) {
            case "add_node":
                return { kind: "add", label: `New step ${op.name}${op.end ? ", ends the call" : ""}`, after: op.content };
            case "remove_node":
                return { kind: "remove", label: `Remove step ${op.node}` };
            case "set_task":
                return { kind: "change", label: `Rewrite ${op.node}`, before: taskOf(op.node), after: op.content };
            case "set_persona":
                return { kind: "change", label: "Rewrite the persona", before: document.persona ?? "", after: op.content };
            case "add_edge":
                return { kind: "add", label: `${op.source} → ${op.target} via ${op.function}`, after: op.description };
            case "remove_edge":
                return { kind: "remove", label: `Remove ${op.source} → ${edgeOf(op.source, op.function)?.target ?? "?"} (${op.function})` };
            case "set_edge": {
                const edge = edgeOf(op.source, op.function);
                const rewired = op.target && op.target !== edge?.target;
                return {
                    kind: "change",
                    label: rewired
                        ? `${op.source}: ${op.function} now goes to ${op.target} (was ${edge?.target ?? "?"})`
                        : `${op.source}: when to take ${op.function}`,
                    before: op.description ? edge?.description : undefined,
                    after: op.description,
                };
            }
            case "add_function": {
                const fields = Object.keys(op.properties ?? {});
                return {
                    kind: "add",
                    label: `New function ${op.name}${fields.length ? ` (${fields.join(", ")})` : ""}`,
                    after: op.description,
                };
            }
            case "set_initial":
                return { kind: "change", label: `Calls now start at ${op.node}`, before: document.initial_node };
            case "set_end":
                return { kind: op.end ? "add" : "remove", label: op.end ? `${op.node} ends the call` : `${op.node} no longer ends the call` };
        }
    });
}
