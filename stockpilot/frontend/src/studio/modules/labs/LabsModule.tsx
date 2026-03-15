import { useEffect, useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { CanvasStudio } from "../../../components/canvas/CanvasStudio";
import { useFileUpload } from "../../../hooks/useFileUpload";
import type { RecentUpload, UploadStage, UploadWorkflowResult } from "../../../types/stock";
import {
    isStudioSyncEnvelope,
    loadLatestWorkflowResult,
    saveLatestWorkflowResult
} from "../../../utils/studio";

interface LabsModuleProps {
    workspaceUrl: string;
}

export function LabsModule({ workspaceUrl }: LabsModuleProps) {
    const [result, setResult] = useState<UploadWorkflowResult | null>(() => loadLatestWorkflowResult());
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [history, setHistory] = useState<RecentUpload[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStage, setUploadStage] = useState<UploadStage>("idle");

    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadMutation = useFileUpload({
        onProgressChange: setUploadProgress,
        onStageChange: setUploadStage
    });

    // Persistence
    useEffect(() => {
        saveLatestWorkflowResult(result);
    }, [result]);

    // Receive data synced from main workspace
    useEffect(() => {
        function handleMessage(event: MessageEvent) {
            let allowedOrigin = window.location.origin;
            try {
                allowedOrigin = new URL(workspaceUrl, window.location.origin).origin;
            } catch {
                allowedOrigin = window.location.origin;
            }
            if (event.origin !== allowedOrigin) return;
            if (window.opener && event.source !== window.opener) return;
            if (!isStudioSyncEnvelope(event.data)) return;
            setResult(event.data.payload);
        }

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [workspaceUrl]);

    function handleUpload(file: File) {
        setCurrentFile(file);
        setUploadError(null);
        setIsUploading(true);
        setUploadProgress(0);
        setUploadStage("uploading");

        uploadMutation.mutate(file, {
            onSuccess(nextResult) {
                setIsUploading(false);
                setUploadError(null);
                setResult(nextResult);
                setHistory((prev) =>
                    [
                        {
                            fileName: nextResult.parsed.fileName,
                            processedAt: new Date().toISOString(),
                            rowCount: nextResult.parsed.rowCount,
                            source: nextResult.source
                        },
                        ...prev
                    ].slice(0, 5)
                );
            },
            onError(error) {
                setIsUploading(false);
                setUploadStage("idle");
                setUploadError(error instanceof Error ? error.message : "Upload failed.");
            }
        });
    }

    function handleClear() {
        setCurrentFile(null);
        setResult(null);
        setHistory([]);
        setUploadError(null);
        setUploadProgress(0);
        setUploadStage("idle");
        uploadMutation.reset();
    }

    function openFilePicker() {
        fileInputRef.current?.click();
    }

    const fileName = result?.parsed.fileName ?? currentFile?.name ?? null;
    const rowCount = result?.parsed.rowCount ?? null;

    return (
        <div className="px-4 pb-16 pt-4 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-[1680px]">
                {/* Dataset bar – always visible */}
                <div className="mb-4 flex flex-col overflow-hidden rounded-[12px] border border-slate-200/70 bg-white/80 backdrop-blur-sm">
                    <div className="flex items-center justify-between px-4 py-2.5">
                        {isUploading ? (
                            /* Uploading state */
                            <div className="flex flex-1 items-center gap-3">
                                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    Processing
                                </span>
                                <span className="font-display text-[0.84rem] font-medium tracking-tight text-ink">
                                    {currentFile?.name ?? "file"}
                                </span>
                                <span className="text-[0.72rem] text-slate-400 capitalize">
                                    {uploadStage}…
                                </span>
                            </div>
                        ) : fileName ? (
                            /* Data loaded state */
                            <div className="flex flex-1 items-center gap-3">
                                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    Dataset
                                </span>
                                <span className="font-display text-[0.84rem] font-medium tracking-tight text-ink">
                                    {fileName}
                                </span>
                                {rowCount !== null && (
                                    <span className="text-[0.72rem] text-slate-400">
                                        {rowCount.toLocaleString()} rows
                                    </span>
                                )}
                                {uploadError && (
                                    <span className="text-[0.72rem] text-rose-500">{uploadError}</span>
                                )}
                            </div>
                        ) : (
                            /* Empty state */
                            <div className="flex flex-1 items-center gap-3">
                                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                    No dataset
                                </span>
                                {uploadError && (
                                    <span className="text-[0.72rem] text-rose-500">{uploadError}</span>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            {!isUploading && (
                                <button
                                    type="button"
                                    onClick={openFilePicker}
                                    className="inline-flex items-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-[0.72rem] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-ink"
                                >
                                    <UploadCloud className="h-3.5 w-3.5" />
                                    {result ? "Change file" : "Upload file"}
                                </button>
                            )}
                            {result && !isUploading && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-rose-500"
                                    aria-label="Clear dataset"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Progress bar stripe (shown while uploading) */}
                    {isUploading && (
                        <div className="h-1 w-full overflow-hidden bg-slate-100">
                            <div
                                className="h-full transition-all duration-300"
                                style={{
                                    width: `${uploadProgress}%`,
                                    background: "linear-gradient(to right, #FF416C, #FF9068, #FFD93D, #6BCF7F, #4D96FF, #FF416C)",
                                    backgroundSize: "200% auto",
                                    animation: "shimmer 3s linear infinite",
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                        e.target.value = "";
                    }}
                />

                <CanvasStudio analysis={result?.analysis ?? null} />
            </div>
        </div>
    );
}
