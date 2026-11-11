import { describe, expect, it } from "vitest";

import shared from "../../../../contracts/patch-cases.json";
import type { AgentDocument } from "../editor/agentDocument";
import type { FunctionTemplate } from "../function-catalog/functionTemplate";
import { applyOps } from "./applyOps";
import type { PatchOp } from "./patch";

type SharedCase = {
    name: string;
    document: AgentDocument;
    catalog: FunctionTemplate[];
    ops: PatchOp[];
    expected?: { agent: AgentDocument; functions: FunctionTemplate[] };
    error?: string;
};

// The canvas preview must change an agent exactly the way the server does
// (backend/domain/patch.py runs the same cases), or Keep would land something
// different from what the reviewer saw.
describe("applyOps matches the server on the shared patch cases", () => {
    for (const item of shared.cases as unknown as SharedCase[]) {
        it(item.name, () => {
            if (item.error) {
                expect(() => applyOps(item.document, item.ops, item.catalog)).toThrow(item.error);
                return;
            }
            expect(applyOps(item.document, item.ops, item.catalog)).toEqual(item.expected);
        });
    }
});
