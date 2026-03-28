import { Film, ImagePlus, X } from "lucide-react";
import { useRef } from "react";
import { AUDIT_MEDIA_LIMIT } from "../constants";
import type { AuditMediaMeta } from "../types";

interface AuditMediaUploadProps {
    mediaFiles: AuditMediaMeta[];
    onAddMedia: (files: File[]) => void;
    onRemoveMedia: (index: number) => void;
    triggerClassName?: string;
    showTrigger?: boolean;
    showPreviews?: boolean;
}

export function AuditMediaUpload({
    mediaFiles,
    onAddMedia,
    onRemoveMedia,
    triggerClassName = "",
    showTrigger = true,
    showPreviews = true,
}: AuditMediaUploadProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const remaining = Math.max(AUDIT_MEDIA_LIMIT - mediaFiles.length, 0);

    function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) {
            return;
        }

        onAddMedia(Array.from(files).slice(0, remaining));
    }

    return (
        <div className={`flex items-center ${showTrigger && showPreviews ? "gap-2" : ""}`}>
            {showTrigger ? (
                <>
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={remaining === 0}
                        aria-label="Upload media"
                        className={`relative inline-flex items-center justify-center text-[12px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${triggerClassName}`}
                    >
                        <ImagePlus className="h-[18px] w-[18px]" />
                        {mediaFiles.length > 0 ? (
                            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
                        ) : null}
                    </button>

                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                            handleFiles(event.target.files);
                            event.target.value = "";
                        }}
                    />
                </>
            ) : null}

            {showPreviews ? (
                <div className="flex flex-wrap items-center gap-2">
                    {mediaFiles.map((media, index) => {
                        const isImage = media.type.startsWith("image/");
                        const isVideo = media.type.startsWith("video/");

                        return (
                            <div key={`${media.name}-${media.createdAt}-${index}`} className="relative h-[72px] w-[72px] overflow-hidden rounded-[10px] border border-line bg-slate-100">
                                {media.objectUrl && isImage ? (
                                    <img src={media.objectUrl} alt={media.name} className="h-full w-full object-cover" />
                                ) : media.objectUrl && isVideo ? (
                                    <video src={media.objectUrl} className="h-full w-full object-cover" muted />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                                        <Film className="h-4 w-4" />
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onRemoveMedia(index)}
                                    aria-label={`Remove ${media.name}`}
                                    className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white shadow-[0_4px_10px_rgba(15,23,42,0.18)]"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
