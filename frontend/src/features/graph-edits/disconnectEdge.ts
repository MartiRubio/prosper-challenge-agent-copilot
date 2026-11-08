import type { AgentDocument } from "../editor/agentDocument";
import type { DrawnEdge } from "../agent-graph/drawnEdge";

export function disconnectEdge(document: AgentDocument, edge: DrawnEdge): AgentDocument {
    if (edge.kind === "start") {
        return document;
    }
    const next = structuredClone(document);
    const node = next.nodes.find((item) => item.name === edge.source);
    if (!node) {
        return document;
    }
    if (edge.kind === "end") {
        if (!node.end) {
            return document;
        }
        node.end = false;
        return next;
    }
    const edges = node.edges ?? [];
    if (!edge.functionName || !edges.some((item) => item.function === edge.functionName)) {
        return document;
    }
    node.edges = edges.filter((item) => item.function !== edge.functionName);
    return next;
}
