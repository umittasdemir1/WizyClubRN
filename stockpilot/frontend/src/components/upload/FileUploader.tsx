import { motion } from "framer-motion";
import { FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import type { RecentUpload, UploadStage } from "../../types/stock";

interface FileUploaderProps {
    currentFile: File | null;
    isLoading: boolean;
    onSelect: (file: File) => void;
    onClear: () => void;
    latestUpload: RecentUpload | null;
    uploadProgress: number;
    uploadStage: UploadStage;
}

function getStatusLabel(stage: UploadStage) {
    switch (stage) {
        case "uploading":
            return "Uploading dataset";
        case "analyzing":
            return "Running stock analysis";
        case "local-processing":
            return "Switching to local engine";
        case "ready":
            return "Ready";
        default:
            return "Awaiting file";
    }
}

export function FileUploader({
    currentFile,
    isLoading,
    onSelect,
    onClear,
    latestUpload,
    uploadProgress,
    uploadStage
}: FileUploaderProps) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        multiple: false,
        accept: {
            "application/vnd.ms-excel": [".xls"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "text/csv": [".csv"]
        },
        disabled: isLoading,
        onDropAccepted(files) {
            const file = files[0];
            if (file) {
                onSelect(file);
            }
        }
    });

    const visibleFileName = currentFile?.name ?? latestUpload?.fileName ?? null;
    const statusLabel = getStatusLabel(uploadStage);

    return (
        <div
            id="file-uploader-box"
            {...getRootProps()}
            className={`premium-card-dark relative overflow-hidden cursor-pointer p-10 sm:p-16 w-full ${
                isDragActive ? "scale-[1.01] bg-slate-900/90" : ""
            }`}
        >
            {/* Background Story Grid Mask for right 50% */}
            <div 
                className="absolute inset-y-0 right-0 w-[50%] overflow-hidden opacity-20 pointer-events-none"
                style={{ 
                    WebkitMaskImage: "linear-gradient(to left, black 10%, transparent 90%)", 
                    maskImage: "linear-gradient(to left, black 10%, transparent 90%)" 
                }}
            >
                <div className="story-grid-pattern" />
            </div>

            <input {...getInputProps()} />
            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col gap-10"
            >
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 text-white shadow-soft">
                    <UploadCloud className="h-10 w-10" />
                </div>
                <div className="space-y-6 text-left">
                    <h3 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
                        Drag a stock file here
                    </h3>
                    <p className="text-lg leading-relaxed text-slate-400 sm:text-xl max-w-2xl">
                        `.xlsx`, `.xls`, and `.csv` are supported. The app normalizes messy headers
                        and can still analyze data if the backend is offline.
                    </p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-300">
                    <span className="rounded-2xl bg-white/10 px-5 py-3 shadow-soft border border-white/5">
                        Multi-store ready
                    </span>
                    <span className="rounded-2xl bg-white/10 px-5 py-3 shadow-soft border border-white/5">
                        ABC analysis
                    </span>
                    <span className="rounded-2xl bg-white/10 px-5 py-3 shadow-soft border border-white/5">
                        Transfer suggestions
                    </span>
                </div>

                {visibleFileName ? (
                    <div className="relative mt-6 rounded-[32px] border border-white/10 bg-white/5 px-8 py-6 text-base text-slate-300 shadow-xl">
                        {!isLoading ? (
                            <button
                                type="button"
                                aria-label="Clear uploaded file"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onClear();
                                }}
                                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/40 text-slate-300 transition hover:border-white/20 hover:bg-slate-950/60 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        ) : null}

                        <div className="flex items-start gap-5">
                            <FileSpreadsheet className="mt-1 h-8 w-8 shrink-0 text-brand" />
                            <div className="min-w-0 flex-1">
                                <p className="mb-1 truncate pr-10 font-semibold leading-none text-white sm:text-xl">
                                    {visibleFileName}
                                </p>

                                {isLoading ? (
                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                                            <span>{statusLabel}</span>
                                            <span>{uploadProgress}%</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                            <motion.div
                                                className="h-full rounded-full bg-[linear-gradient(90deg,#FF9068_0%,#FFD93D_36%,#6BCF7F_68%,#4D96FF_100%)] shadow-[0_0_18px_rgba(77,150,255,0.35)]"
                                                initial={false}
                                                animate={{ width: `${Math.max(uploadProgress, 8)}%` }}
                                                transition={{ duration: 0.28, ease: "easeOut" }}
                                            />
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            Your inventory snapshot is being normalized and prepared for the workspace.
                                        </p>
                                    </div>
                                ) : latestUpload ? (
                                    <p className="text-sm opacity-70">
                                        {latestUpload.rowCount} rows processed via {latestUpload.source}
                                    </p>
                                ) : (
                                    <p className="text-sm opacity-70">
                                        File ready for a fresh upload cycle.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}
            </motion.div>
        </div>
    );
}
