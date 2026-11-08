import { useMemo } from "react";

import { splitTokens } from "./countTokens";

const COLORS = ["#f3e3c3", "#d9efe6", "#f6d6d6", "#d9e4f5", "#efe6d4", "#e4d9f0"];

type TokenViewProps = {
    text: string;
    model: string;
};

export function useTokenCount(text: string, model: string): number {
    return useMemo(() => splitTokens(text, model).length, [text, model]);
}

export function TokenView({ text, model }: TokenViewProps) {
    const pieces = useMemo(() => splitTokens(text, model), [text, model]);
    return (
        <div className="token-view" aria-hidden="true">
            {pieces.map((piece, index) => (
                <span key={`${index}:${piece}`} style={{ background: COLORS[index % COLORS.length] }}>
                    {piece}
                </span>
            ))}
            {text.endsWith("\n") ? "\n" : null}
        </div>
    );
}
