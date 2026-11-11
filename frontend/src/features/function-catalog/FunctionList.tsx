import { Plus, Trash2 } from "lucide-react";

import type { FunctionTemplate } from "./functionTemplate";

type FunctionListProps = {
    functions: FunctionTemplate[];
    selected: string | null;
    onSelect: (name: string) => void;
    onCreate: () => void;
    onDelete: (name: string) => void;
};

export function FunctionList({ functions, selected, onSelect, onCreate, onDelete }: FunctionListProps) {
    return (
        <div className="nav-list">
            <div className="inspector-row">
                <p className="eyebrow">Functions</p>
                <button type="button" className="pill" onClick={onCreate}>
                    <Plus className="nav-icon icon-add" aria-hidden="true" />
                    New
                </button>
            </div>
            {functions.length === 0 ? (
                <p className="muted">No functions yet.</p>
            ) : (
                <ul>
                    {functions.map((fn) => (
                        <li key={fn.name} className="nav-row">
                            <button
                                type="button"
                                className="pill agent-pill is-code"
                                aria-current={fn.name === selected ? "true" : undefined}
                                onClick={() => onSelect(fn.name)}
                            >
                                {fn.name}
                            </button>
                            <button
                                type="button"
                                className="icon-button"
                                aria-label={`Delete ${fn.name}`}
                                onClick={() => onDelete(fn.name)}
                            >
                                <Trash2 className="nav-icon" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
