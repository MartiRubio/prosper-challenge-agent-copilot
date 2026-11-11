export const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

/** JSON request against the agent API. A failed response throws its `detail`, or the fallback. */
export async function requestJson<T>(path: string, fallback: string, init?: RequestInit): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`${API_URL}${path}`, init);
    } catch {
        throw new Error("The agent API is not reachable. Is `make api` running?");
    }
    if (!response.ok) {
        throw new Error(await errorDetail(response, fallback));
    }
    return response.json() as Promise<T>;
}

export function jsonBody(method: string, body: unknown): RequestInit {
    return {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}

async function errorDetail(response: Response, fallback: string): Promise<string> {
    try {
        const body = (await response.json()) as { detail?: unknown };
        if (typeof body.detail === "string" && body.detail) {
            return body.detail;
        }
    } catch {
        // The body was not JSON.
    }
    return fallback;
}
