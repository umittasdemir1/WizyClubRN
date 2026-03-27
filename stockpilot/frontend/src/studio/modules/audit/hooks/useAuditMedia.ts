import { useCallback, useEffect, useRef } from "react";
import type { AuditMediaMeta, AuditQuestionResponse } from "../types";

export function useAuditMedia() {
    const objectUrlsRef = useRef(new Set<string>());

    const revokeUrl = useCallback((objectUrl?: string | null) => {
        if (!objectUrl) {
            return;
        }

        URL.revokeObjectURL(objectUrl);
        objectUrlsRef.current.delete(objectUrl);
    }, []);

    const addFiles = useCallback((currentMedia: AuditMediaMeta[], files: File[]) => {
        return [
            ...currentMedia,
            ...files.map((file) => {
                const objectUrl = URL.createObjectURL(file);
                objectUrlsRef.current.add(objectUrl);

                return {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    createdAt: new Date().toISOString(),
                    objectUrl,
                };
            }),
        ];
    }, []);

    const removeMedia = useCallback((currentMedia: AuditMediaMeta[], index: number) => {
        const target = currentMedia[index];
        if (target?.objectUrl) {
            revokeUrl(target.objectUrl);
        }

        return currentMedia.filter((_, currentIndex) => currentIndex !== index);
    }, [revokeUrl]);

    const revokeResponseMedia = useCallback((responses: Record<number, AuditQuestionResponse>) => {
        Object.values(responses).forEach((response) => {
            response.mediaFiles.forEach((media) => {
                if (media.objectUrl) {
                    revokeUrl(media.objectUrl);
                }
            });
        });
    }, [revokeUrl]);

    useEffect(() => {
        return () => {
            objectUrlsRef.current.forEach((objectUrl) => {
                URL.revokeObjectURL(objectUrl);
            });
            objectUrlsRef.current.clear();
        };
    }, []);

    return {
        addFiles,
        removeMedia,
        revokeResponseMedia,
    };
}
