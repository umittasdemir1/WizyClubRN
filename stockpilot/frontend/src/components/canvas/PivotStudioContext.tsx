import { createContext, useContext, type ReactNode } from "react";
import type { UploadStage, UploadWorkflowResult } from "../../types/stock";

// ── Upload state shape ────────────────────────────────────────────────────────

/**
 * All upload-related state that was previously prop-drilled from
 * `LabsModule` → `CanvasStudio` → `DatasetPanel`.
 *
 * Placing it in context removes 6 props from the CanvasStudio signature
 * and makes the state directly accessible to any descendant that needs it.
 */
export interface PivotStudioUploadState {
    /** The file currently being uploaded, or null when idle. */
    currentFile: File | null;
    /** True while an upload mutation is in-flight. */
    isUploading: boolean;
    /** Upload progress percentage (0–100). */
    uploadProgress: number;
    /** Current upload pipeline stage. */
    uploadStage: UploadStage;
    /** Error message from the last failed upload, or null. */
    uploadError: string | null;
}

// ── Dataset browsing state shape ──────────────────────────────────────────────

/**
 * Dataset list + navigation state also previously drilled through CanvasStudio.
 */
export interface PivotStudioDatasetState {
    /** All loaded workflow results (one per uploaded file). */
    files: UploadWorkflowResult[];
    /** Index of the currently active file in `files`. */
    activeFileIdx: number;
    /** Switch the active dataset. */
    onSelectFile: (idx: number) => void;
    /** Remove a dataset by index. */
    onRemoveFile: (idx: number) => void;
    /** Open the OS file picker to start a new upload. */
    onUploadClick: () => void;
}

// ── Context definition ────────────────────────────────────────────────────────

export interface PivotStudioContextValue
    extends PivotStudioUploadState,
        PivotStudioDatasetState {}

const PivotStudioContext = createContext<PivotStudioContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

interface PivotStudioProviderProps {
    value: PivotStudioContextValue;
    children: ReactNode;
}

/**
 * Wrap the StockPilot studio tree with this provider to make upload and
 * dataset state available to any descendant without prop drilling.
 *
 * Usage:
 * ```tsx
 * <PivotStudioProvider value={studioState}>
 *   <CanvasStudio analysis={...} />
 * </PivotStudioProvider>
 * ```
 */
export function PivotStudioProvider({ value, children }: PivotStudioProviderProps) {
    return (
        <PivotStudioContext.Provider value={value}>
            {children}
        </PivotStudioContext.Provider>
    );
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

/**
 * Access the PivotStudio context value.
 * Must be called from a component that is a descendant of `PivotStudioProvider`.
 */
export function usePivotStudio(): PivotStudioContextValue {
    const ctx = useContext(PivotStudioContext);
    if (!ctx) {
        throw new Error("usePivotStudio must be used within a PivotStudioProvider");
    }
    return ctx;
}
