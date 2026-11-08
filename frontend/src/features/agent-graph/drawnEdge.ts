export type DrawnEdge = {
    kind: "start" | "end" | "step";
    source: string;
    functionName?: string;
};
