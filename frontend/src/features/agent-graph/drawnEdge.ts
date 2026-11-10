export type DrawnEdge = {
    kind: "start" | "end" | "step";
    source: string;
    functionName?: string;
    review?: "add" | "change" | "remove";
};
