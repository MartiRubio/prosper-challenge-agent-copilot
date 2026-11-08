import { useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { LayoutGrid, Plus, Trash2 } from "lucide-react";

type CanvasToolsProps = {
    arrangeToken: number;
    canRemove: boolean;
    onArrange: () => void;
    onRemove: () => void;
    onAdd: () => void;
};

export function CanvasTools({ arrangeToken, canRemove, onArrange, onRemove, onAdd }: CanvasToolsProps) {
    const { fitView } = useReactFlow();
    useEffect(() => {
        if (arrangeToken === 0) {
            return;
        }
        void fitView({ padding: 0.2 });
    }, [arrangeToken, fitView]);
    return (
        <div className="canvas-tools">
            <button type="button" className="pill" onClick={onArrange}>
                <LayoutGrid className="nav-icon icon-arrange" aria-hidden="true" />
                Auto-arrange
            </button>
            <button type="button" className="pill danger" onClick={onRemove} disabled={!canRemove}>
                <Trash2 className="nav-icon" aria-hidden="true" />
                Remove
            </button>
            <button type="button" className="pill" onClick={onAdd}>
                <Plus className="nav-icon icon-add" aria-hidden="true" />
                Add step
            </button>
        </div>
    );
}
