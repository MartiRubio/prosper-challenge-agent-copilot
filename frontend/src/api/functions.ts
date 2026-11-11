import type { FunctionTemplate } from "../features/function-catalog/functionTemplate";
import { jsonBody, requestJson } from "./http";

export function listFunctions(): Promise<FunctionTemplate[]> {
    return requestJson("/functions", "Could not load functions.");
}

export async function renameFunction(previous: string, name: string, agentId: string | null): Promise<void> {
    await requestJson(
        "/functions/rename",
        "Could not rename that function on the other agents.",
        jsonBody("POST", { from: previous, to: name, agent_id: agentId }),
    );
}

export function saveFunctions(functions: FunctionTemplate[]): Promise<FunctionTemplate[]> {
    return requestJson("/functions", "Could not save functions.", jsonBody("PUT", functions));
}
