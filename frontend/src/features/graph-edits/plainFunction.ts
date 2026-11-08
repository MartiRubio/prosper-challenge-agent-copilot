export const NO_FUNCTION = "no_function";

const PLAIN = /^(?:no_function|continue)(?:[-_]\d+)?$/;

export function isPlainFunction(name: string): boolean {
    return PLAIN.test(name);
}
