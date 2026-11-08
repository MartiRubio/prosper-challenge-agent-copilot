import { useState } from "react";

import type { EdgeField } from "../editor/agentDocument";
import type { FunctionTemplate } from "./functionTemplate";

type FunctionEditorProps = {
    fn: FunctionTemplate | null;
    onChange: (previousName: string, next: FunctionTemplate) => boolean;
};

export function FunctionEditor({ fn, onChange }: FunctionEditorProps) {
    const [name, setName] = useState(fn?.name ?? "");
    const [trackedName, setTrackedName] = useState(fn?.name);
    if (fn?.name !== trackedName) {
        setTrackedName(fn?.name);
        setName(fn?.name ?? "");
    }

    if (!fn) {
        return <p className="muted">Create a function. Its fields become the test data.</p>;
    }

    function commitName() {
        if (!fn) {
            return;
        }
        const trimmed = name.trim();
        if (!trimmed || trimmed === fn.name || !onChange(fn.name, { ...fn, name: trimmed })) {
            setName(fn.name);
        }
    }

    function setFields(properties: Record<string, EdgeField>, required: string[]) {
        if (!fn) {
            return;
        }
        onChange(fn.name, { ...fn, properties, required });
    }

    const fields = Object.entries(fn.properties);
    return (
        <section className="function-stage">
            <header className="stage-heading">
                <p className="eyebrow">Function</p>
            </header>
            <label className="function-label">
                Name
                <input
                    className="pill-input"
                    value={name}
                    aria-label="Function name"
                    onChange={(event) => setName(event.target.value)}
                    onBlur={commitName}
                />
            </label>
            <label className="function-label">
                Description
                <textarea
                    rows={3}
                    value={fn.description}
                    aria-label="Function description"
                    onChange={(event) => onChange(fn.name, { ...fn, description: event.target.value })}
                />
            </label>
            <div className="inspector-row">
                <p className="eyebrow">Fields</p>
                <button type="button" className="pill" onClick={() => addField(fn, setFields)}>
                    Add field
                </button>
            </div>
            <p className="muted">These fields are the test data for every agent that calls this function.</p>
            {fields.length === 0 ? (
                <p className="muted">No fields. The call can take this edge without extra data.</p>
            ) : (
                <div className="function-fields">
                    {fields.map(([fieldName, field]) => (
                        <FieldRow
                            key={fieldName}
                            name={fieldName}
                            field={field}
                            required={fn.required.includes(fieldName)}
                            onChange={(nextName, nextField, isRequired) => replaceField(fn, fieldName, nextName, nextField, isRequired, setFields)}
                            onRemove={() => removeField(fn, fieldName, setFields)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function FieldRow({
    name,
    field,
    required,
    onChange,
    onRemove,
}: {
    name: string;
    field: EdgeField;
    required: boolean;
    onChange: (name: string, field: EdgeField, required: boolean) => void;
    onRemove: () => void;
}) {
    const [draft, setDraft] = useState(name);
    const [tracked, setTracked] = useState(name);
    if (name !== tracked) {
        setTracked(name);
        setDraft(name);
    }
    return (
        <article className="function-field">
            <label>
                Field
                <input
                    className="pill-input"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={() => {
                        const trimmed = draft.trim();
                        if (!trimmed) {
                            setDraft(name);
                            return;
                        }
                        onChange(trimmed, field, required);
                    }}
                />
            </label>
            <label>
                What it is
                <input
                    className="pill-input"
                    value={field.description ?? ""}
                    onChange={(event) => onChange(name, { ...field, description: event.target.value }, required)}
                />
            </label>
            <label>
                Choices
                <input
                    className="pill-input"
                    value={(field.enum ?? []).join(", ")}
                    placeholder="Optional, comma separated"
                    onChange={(event) => onChange(name, { ...field, enum: choices(event.target.value) }, required)}
                />
            </label>
            <label className="check">
                <input
                    type="checkbox"
                    checked={required}
                    onChange={(event) => onChange(name, field, event.target.checked)}
                />
                Required
            </label>
            <button type="button" className="pill danger" onClick={onRemove}>
                Remove
            </button>
        </article>
    );
}

function addField(
    fn: FunctionTemplate,
    setFields: (properties: Record<string, EdgeField>, required: string[]) => void,
) {
    const name = uniqueField(Object.keys(fn.properties), "field");
    setFields({ ...fn.properties, [name]: { type: "string", description: "" } }, fn.required);
}

function removeField(
    fn: FunctionTemplate,
    fieldName: string,
    setFields: (properties: Record<string, EdgeField>, required: string[]) => void,
) {
    const properties = { ...fn.properties };
    delete properties[fieldName];
    setFields(properties, fn.required.filter((item) => item !== fieldName));
}

function replaceField(
    fn: FunctionTemplate,
    previous: string,
    nextName: string,
    field: EdgeField,
    required: boolean,
    setFields: (properties: Record<string, EdgeField>, required: string[]) => void,
) {
    if (nextName !== previous && fn.properties[nextName]) {
        return;
    }
    const properties: Record<string, EdgeField> = {};
    for (const [key, value] of Object.entries(fn.properties)) {
        properties[key === previous ? nextName : key] = key === previous ? field : value;
    }
    const requiredNames = fn.required.filter((item) => item !== previous);
    if (required) {
        requiredNames.push(nextName);
    }
    setFields(properties, requiredNames);
}

function choices(value: string): string[] | undefined {
    const items = value.split(",").map((item) => item.trim()).filter(Boolean);
    return items.length > 0 ? items : undefined;
}

function uniqueField(used: string[], base: string): string {
    if (!used.includes(base)) {
        return base;
    }
    let index = 2;
    while (used.includes(`${base}_${index}`)) {
        index += 1;
    }
    return `${base}_${index}`;
}
