import { createContext, useContext, type ReactNode } from "react";

import type { AgentDocument } from "../editor/agentDocument";
import type { FunctionTemplate } from "../function-catalog/functionTemplate";
import type { DrawnEdge } from "./drawnEdge";

export type GraphActions = {
    document: AgentDocument;
    functions: FunctionTemplate[];
    renameNode: (from: string, to: string) => void;
    setTask: (nodeName: string, content: string) => void;
    assignFunction: (source: string, functionName: string, choice: string) => void;
    removeEdge: (edge: DrawnEdge) => void;
    locked: boolean;
};

const GraphActionsContext = createContext<GraphActions | null>(null);

export function GraphActionsProvider({
    value,
    children,
}: {
    value: GraphActions;
    children: ReactNode;
}) {
    return <GraphActionsContext.Provider value={value}>{children}</GraphActionsContext.Provider>;
}

export function useGraphActions(): GraphActions {
    const value = useContext(GraphActionsContext);
    if (!value) {
        throw new Error("Graph actions are only available inside the canvas.");
    }
    return value;
}
