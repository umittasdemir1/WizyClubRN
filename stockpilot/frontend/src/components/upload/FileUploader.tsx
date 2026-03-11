import { motion } from "framer-motion";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import type { RecentUpload } from "../../types/stock";

interface FileUploaderProps {
    isLoading: boolean;
    onSelect: (file: File) => void;
    latestUpload: RecentUpload | null;
}

export function FileUploader({ isLoading, onSelect, latestUpload }: FileUploaderProps) {
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

                {latestUpload ? (
                    <div className="mt-6 flex items-center gap-5 rounded-[32px] border border-white/10 bg-white/5 px-8 py-6 text-base text-slate-300 shadow-xl">
                        <FileSpreadsheet className="h-8 w-8 text-brand" />
                        <div>
                            <p className="font-semibold text-xl text-white leading-none mb-1">{latestUpload.fileName}</p>
                            <p className="opacity-70 text-sm">
                                {latestUpload.rowCount} rows processed via {latestUpload.source}
                            </p>
                        </div>
                    </div>
                ) : null}
            </motion.div>
        </div>
    );
}
