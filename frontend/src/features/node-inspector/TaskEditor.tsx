type TaskEditorProps = {
    content: string;
    onChange: (content: string) => void;
};

export function TaskEditor({ content, onChange }: TaskEditorProps) {
    return (
        <label className="field">
            Spoken task
            <textarea
                rows={5}
                value={content}
                onChange={(event) => onChange(event.target.value)}
            />
        </label>
    );
}
