import type { TestField } from "./testFields";

type FieldInputsProps = {
    fields: TestField[];
    values: Record<string, string>;
    onChange: (name: string, value: string) => void;
};

export function FieldInputs({ fields, values, onChange }: FieldInputsProps) {
    return (
        <div className="test-fields">
            {fields.map((field) => (
                <label key={field.name}>
                    {field.label}
                    {field.options ? (
                        <select
                            className="pill-input"
                            value={values[field.name] ?? ""}
                            onChange={(event) => onChange(field.name, event.target.value)}
                        >
                            <option value="">Choose</option>
                            {field.options.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            className="pill-input"
                            value={values[field.name] ?? ""}
                            onChange={(event) => onChange(field.name, event.target.value)}
                        />
                    )}
                </label>
            ))}
        </div>
    );
}
