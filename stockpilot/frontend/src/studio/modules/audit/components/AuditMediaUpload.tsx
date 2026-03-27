import { Film, ImagePlus, X } from "lucide-react";
import { useRef } from "react";
import { AUDIT_MEDIA_LIMIT } from "../constants";
import type { AuditMediaMeta } from "../types";

interface AuditMediaUploadProps {
    mediaFiles: AuditMediaMeta[];
    onAddMedia: (files: File[]) => void;
    onRemoveMedia: (index: number) => void;
}

export function AuditMediaUpload({ mediaFiles, onAddMedia, onRemoveMedia }: AuditMediaUploadProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const remaining = Math.max(AUDIT_MEDIA_LIMIT - mediaFiles.length, 0);

    function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) {
            return;
        }

        onAddMedia(Array.from(files).slice(0, remaining));
    }

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={remaining === 0}
                aria-label="Upload media"
                className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-line bg-white text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <ImagePlus className="h-4.5 w-4.5" />
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

            <div className="flex items-center gap-2">
                {mediaFiles.map((media, index) => {
                    const isImage = media.type.startsWith("image/");
                    const isVideo = media.type.startsWith("video/");

                    return (
                        <div key={`${media.name}-${media.createdAt}-${index}`} className="relative h-[50px] w-[50px] overflow-hidden rounded-[12px] border border-line bg-slate-100">
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
                                className="absolute -right-1 -top-1 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full bg-ink text-white"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
