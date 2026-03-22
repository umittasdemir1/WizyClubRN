import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useFileUpload } from "../hooks/useFileUpload";
import type { PivotStudioContextValue } from "../components/canvas/PivotStudioContext";
import type { UploadStage, UploadWorkflowResult } from "../types/stock";
import {
    isStudioSyncEnvelope,
    loadLatestWorkflowResult,
    saveLatestWorkflowResult
} from "../utils/studio";

export function useStudioWorkflowState(workspaceUrl: string) {
    const [results, setResults] = useState<UploadWorkflowResult[]>(() => {
        const saved = loadLatestWorkflowResult();
        return saved ? [saved] : [];
    });
    const [activeIdx, setActiveIdx] = useState(0);

    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStage, setUploadStage] = useState<UploadStage>("idle");

    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadMutation = useFileUpload({
        onProgressChange: setUploadProgress,
        onStageChange: setUploadStage,
    });

    useEffect(() => {
        saveLatestWorkflowResult(results[activeIdx] ?? null);
    }, [results, activeIdx]);

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

            setResults((prev) => {
                const next = [...prev, event.data.payload];
                setActiveIdx(next.length - 1);
                return next;
            });
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
                setResults((prev) => {
                    const next = [...prev, nextResult];
                    setActiveIdx(next.length - 1);
                    return next;
                });
            },
            onError(error) {
                setIsUploading(false);
                setUploadStage("idle");
                setUploadError(error instanceof Error ? error.message : "Upload failed.");
            },
        });
    }

    function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (file) {
            handleUpload(file);
        }
        event.target.value = "";
    }

    function removeDataset(idx: number) {
        setResults((prev) => {
            const next = prev.filter((_, i) => i !== idx);
            setActiveIdx((current) => Math.min(current, Math.max(0, next.length - 1)));
            return next;
        });
    }

    function openFilePicker() {
        fileInputRef.current?.click();
    }

    const activeResult = results[activeIdx] ?? null;

    const contextValue: PivotStudioContextValue = {
        currentFile,
        isUploading,
        uploadProgress,
        uploadStage,
        uploadError,
        files: results,
        activeFileIdx: activeIdx,
        onSelectFile: setActiveIdx,
        onRemoveFile: removeDataset,
        onUploadClick: openFilePicker,
    };

    return {
        activeResult,
        contextValue,
        fileInputRef,
        handleFileInputChange,
    };
}
