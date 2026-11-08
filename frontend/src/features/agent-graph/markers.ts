export const START_ID = "start";
export const END_ID = "end";

export function isCallMarker(name: string): boolean {
    const id = name.trim().toLowerCase();
    return id === START_ID || id === END_ID;
}
