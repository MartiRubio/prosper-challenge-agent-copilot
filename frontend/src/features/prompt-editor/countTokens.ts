import { encodingForModel, getEncoding, type Tiktoken, type TiktokenModel } from "js-tiktoken";

const encoders = new Map<string, Tiktoken>();

export function splitTokens(text: string, model: string): string[] {
    try {
        const encoder = encoderFor(model);
        return encoder.encode(text, [], []).map((id) => encoder.decode([id]));
    } catch {
        return [text];
    }
}

function encoderFor(model: string): Tiktoken {
    const cached = encoders.get(model);
    if (cached) {
        return cached;
    }
    let encoder: Tiktoken;
    try {
        encoder = encodingForModel(model as TiktokenModel);
    } catch {
        encoder = getEncoding("o200k_base");
    }
    encoders.set(model, encoder);
    return encoder;
}
