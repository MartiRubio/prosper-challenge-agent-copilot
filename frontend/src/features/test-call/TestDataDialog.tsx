import { useEffect } from "react";

import { FieldInputs } from "./FieldInputs";
import type { TestField } from "./testFields";

type TestDataDialogProps = {
    fields: TestField[];
    values: Record<string, string>;
    onChange: (name: string, value: string) => void;
    onClose: () => void;
};

export function TestDataDialog({ fields, values, onChange, onClose }: TestDataDialogProps) {
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
                    <button type="button" className="pill" onClick={onClose}>
                        Close
                    </button>
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
