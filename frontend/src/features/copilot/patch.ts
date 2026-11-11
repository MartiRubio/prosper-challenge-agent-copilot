import type { EdgeField } from "../editor/agentDocument";

export type PatchOp =
    | { op: "set_task"; node: string; content: string }
    | { op: "set_persona"; content: string }
    | { op: "add_node"; name: string; content?: string; end?: boolean }
    | { op: "remove_node"; node: string }
    | { op: "add_edge"; source: string; function: string; description?: string; target: string; properties?: Record<string, EdgeField>; required?: string[] }
    | { op: "remove_edge"; source: string; function: string }
    | { op: "set_edge"; source: string; function: string; description?: string; target?: string }
    | { op: "add_function"; name: string; description?: string; properties?: Record<string, EdgeField>; required?: string[] }
    | { op: "set_initial"; node: string }
    | { op: "set_end"; node: string; end: boolean };

/** Where a proposed change comes from: a call line, a guideline sentence, or the request itself. */
export type Evidence = {
    source: "call" | "attachment" | "request";
    ref: string;
    quote: string;
    verified: boolean;
};

export type ProposedChange = {
    id: string;
    title: string;
    detail: string;
    evidence?: Evidence[];
    ops: PatchOp[];
};
