import { useState } from "react";
import { LoaderCircle, WandSparkles } from "lucide-react";

import { generateTestData } from "../../api/copilot";
import type { AgentDocument } from "../editor/agentDocument";
import type { TestField } from "./testFields";

type GenerateTestDataProps = {
    agent: AgentDocument;
    fields: TestField[];
    onValues: (values: Record<string, string>) => void;
};

/** Fill every test field with one consistent, made-up caller. */
export function GenerateTestData({ agent, fields, onValues }: GenerateTestDataProps) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    if (fields.length === 0) {
        return null;
    }
    return (
        <span className="wand-wrap">
            <button
                type="button"
                className={busy ? "btn btn-ai is-busy" : "btn btn-ai"}
                disabled={busy}
                title="Make up a realistic caller for these fields"
                onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                        onValues(await generateTestData(agent, fields));
                    } catch (caught) {
                        setError(caught instanceof Error ? caught.message : "Could not make up test data.");
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                {busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <WandSparkles aria-hidden="true" />}
                {busy ? "Making up a caller…" : "Fill with AI"}
            </button>
            {error ? <span className="error">{error}</span> : null}
        </span>
    );
}
