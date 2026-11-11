export function uniqueName(base: string, used: Iterable<string>): string {
    const taken = new Set(used);
    if (!taken.has(base)) {
        return base;
    }
    let index = 2;
    while (taken.has(`${base}_${index}`)) {
        index += 1;
    }
    return `${base}_${index}`;
}
