import { motion } from "framer-motion";
import { FileSpreadsheet, UploadCloud, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import type { RecentUpload, UploadStage } from "../../types/stock";

interface FileUploaderProps {
    currentFile: File | null;
    errorMessage: string | null;
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
            return "Running product analysis";
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
    errorMessage,
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-white shadow-soft">
                        <UploadCloud className="h-10 w-10" />
                    </div>
                    <div className="min-w-0 space-y-2 text-left">
                        <h3 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
                            Drag a stock file here
                        </h3>
                        <p className="text-lg leading-relaxed text-slate-400 sm:text-xl max-w-2xl">
                            Supported formats: `.xlsx`, `.xls`, `.csv`
                        </p>
                    </div>
                </div>

                {errorMessage ? (
                    <div className="rounded-[28px] border border-rose-300/35 bg-rose-500/10 px-6 py-5 text-left text-sm text-rose-100 shadow-soft">
                        {errorMessage}
                    </div>
                ) : null}

                {isLoading ? (
                    <div className="mt-6 w-full max-w-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                {statusLabel}
                            </span>
                            <span className="text-xs font-semibold tabular-nums text-slate-500">
                                {Math.round(uploadProgress)}%
                            </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-brand transition-all duration-300 ease-out"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                ) : visibleFileName ? (
                    <div className="relative mt-6 inline-flex items-center rounded-[24px] border border-white/10 bg-white/5 px-6 py-4 text-base text-slate-300 shadow-xl">
                        <button
                            type="button"
                            aria-label="Clear uploaded file"
                            onClick={(event) => {
                                event.stopPropagation();
                                onClear();
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-950/40 text-slate-300 transition hover:border-white/20 hover:bg-slate-950/60 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="flex items-center gap-4 pr-10">
                            <FileSpreadsheet className="h-6 w-6 shrink-0 text-brand" />
                            <p className="truncate font-semibold leading-none text-white">
                                {visibleFileName}
                            </p>
                        </div>
                    </div>
                ) : null}
            </motion.div>
        </div>
    );
}
