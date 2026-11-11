import { useEffect } from "react";

import type { AgentDocument } from "../editor/agentDocument";
import { FieldInputs } from "./FieldInputs";
import { GenerateTestData } from "./GenerateTestData";
import type { TestField } from "./testFields";

type TestDataDialogProps = {
    agent: AgentDocument;
    fields: TestField[];
    values: Record<string, string>;
    onChange: (name: string, value: string) => void;
    onClose: () => void;
};

export function TestDataDialog({ agent, fields, values, onChange, onClose }: TestDataDialogProps) {
    useEffect(() => {
        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="prompt-backdrop" onMouseDown={onClose}>
            <section
                className="prompt-dialog"
                role="dialog"
                aria-label="Test data"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="prompt-toolbar">
                    <p className="eyebrow">Test data</p>
                    <div className="pill-row">
                        <GenerateTestData
                            agent={agent}
                            fields={fields}
                            onValues={(generated) => Object.entries(generated).forEach(([name, value]) => onChange(name, value))}
                        />
                        <button type="button" className="btn" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </header>
                <p className="muted">
                    {fields.length === 0
                        ? "This agent doesn't call a function that collects data. Define one in Functions, then choose it on an edge."
                        : "These fields come from the functions this agent calls. Start from node uses them."}
                </p>
                <FieldInputs fields={fields} values={values} onChange={onChange} />
            </section>
        </div>
    );
}
