import type { FunctionTemplate } from "../features/function-catalog/functionTemplate";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function listFunctions(): Promise<FunctionTemplate[]> {
    const response = await fetch(`${API_URL}/functions`);
    if (!response.ok) {
        throw new Error("Could not load functions.");
    }
    return response.json() as Promise<FunctionTemplate[]>;
}

export async function renameFunction(previous: string, name: string, agentId: string | null): Promise<void> {
    const response = await fetch(`${API_URL}/functions/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: previous, to: name, agent_id: agentId }),
    });
    if (!response.ok) {
        throw new Error("Could not rename that function on the other agents.");
    }
}

export async function saveFunctions(functions: FunctionTemplate[]): Promise<FunctionTemplate[]> {
    const response = await fetch(`${API_URL}/functions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(functions),
    });
    if (!response.ok) {
        throw new Error("Could not save functions.");
    }
    return response.json() as Promise<FunctionTemplate[]>;
}
