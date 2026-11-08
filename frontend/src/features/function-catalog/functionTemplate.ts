import type { EdgeField } from "../editor/agentDocument";

export type FunctionTemplate = {
    name: string;
    description: string;
    properties: Record<string, EdgeField>;
    required: string[];
};
