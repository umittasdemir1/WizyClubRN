import { CanvasStudio } from "../../../components/canvas/CanvasStudio";
import { usePivotStudio } from "../../../components/canvas/PivotStudioContext";
import { ErrorBoundary } from "../../../components/ErrorBoundary";

export function LabsModule() {
    const { files, activeFileIdx } = usePivotStudio();
    const activeResult = files[activeFileIdx] ?? null;

    return (
        <div className="pb-0 pt-4">
            <div className="mx-auto max-w-full px-4 sm:px-8 lg:px-0">
                <ErrorBoundary>
                    <CanvasStudio analysis={activeResult?.analysis ?? null} />
                </ErrorBoundary>
            </div>
        </div>
    );
}
