import type { ProposedChange } from "./patch";

/** A proposed change as it sits in review: still open, kept into the agent, or thrown away. */
export type ReviewChange = ProposedChange & {
    status: "pending" | "kept" | "discarded";
};
