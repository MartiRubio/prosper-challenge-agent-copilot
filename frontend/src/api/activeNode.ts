const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export async function getActiveNode(agentId: string): Promise<string | null> {
    const response = await fetch(`${API_URL}/active-node/${encodeURIComponent(agentId)}`);
    if (!response.ok) {
        return null;
    }
    const body = (await response.json()) as { node?: unknown };
    return typeof body.node === "string" ? body.node : null;
}
