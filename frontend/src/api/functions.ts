import type { FunctionTemplate } from "../features/function-catalog/functionTemplate";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function listFunctions(): Promise<FunctionTemplate[]> {
    const response = await fetch(`${API_URL}/functions`);
    if (!response.ok) {
        throw new Error("Could not load functions.");
    }
    return response.json() as Promise<FunctionTemplate[]>;
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
