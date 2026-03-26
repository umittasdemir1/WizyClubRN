import axios from "axios";
import { useEffect, useRef, useState } from "react";
import {
    getAcademiaTranscriptionStatus,
    transcribeAcademiaMedia,
} from "../../../../services/api";
import type { AcademiaTranscriptResult, AcademiaTranscriptionStatus } from "../../../../types/academia";
import { readCachedTranscript, writeCachedTranscript } from "../cache";
import type { AcademiaRequestState } from "../types";
import { buildAcademiaRequestId, buildLocalStatus, getErrorMessage } from "../utils";

export interface UseAcademiaTranscriptionResult {
    requestState: AcademiaRequestState;
    uploadProgress: number;
    errorMessage: string;
    transcript: AcademiaTranscriptResult | null;
    transcriptionStatus: AcademiaTranscriptionStatus | null;
    isTranscriptionRunning: boolean;
    transcriptProgress: number;
}

export function useAcademiaTranscription(mediaFile: File | null): UseAcademiaTranscriptionResult {
    const requestIdRef = useRef(0);

    const [requestState, setRequestState] = useState<AcademiaRequestState>("idle");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");
    const [transcript, setTranscript] = useState<AcademiaTranscriptResult | null>(null);
    const [transcriptionStatus, setTranscriptionStatus] = useState<AcademiaTranscriptionStatus | null>(null);

    useEffect(() => {
        if (!mediaFile) {
            setTranscriptionStatus(null);
            return undefined;
        }

        // Serve from cache immediately if available.
        const cachedTranscript = readCachedTranscript(mediaFile.name);
        if (cachedTranscript) {
            setTranscript(cachedTranscript);
            setRequestState("ready");
            setUploadProgress(100);
            setErrorMessage("");
            setTranscriptionStatus(
                buildLocalStatus(
                    `cache_${mediaFile.name}`,
                    mediaFile.name,
                    100,
                    "Loaded from local cache.",
                    "completed"
                )
            );
            return undefined;
        }

        let isActive = true;
        let stopped = false;
        let pollTimer: number | null = null;
        let consecutiveErrors = 0;
        const MAX_CONSECUTIVE_ERRORS = 5;
        const currentRequestId = requestIdRef.current + 1;
        const requestId = buildAcademiaRequestId();
        requestIdRef.current = currentRequestId;

        const stopPolling = () => {
            stopped = true;
            if (pollTimer !== null) {
                window.clearTimeout(pollTimer);
                pollTimer = null;
            }
        };

        const updateLocalStatus = (nextStatus: AcademiaTranscriptionStatus) => {
            if (!isActive || requestIdRef.current !== currentRequestId) return;
            setTranscriptionStatus(nextStatus);
            setUploadProgress(nextStatus.progressPercent);
        };

        const scheduleStatusPoll = (delayMs: number) => {
            if (!isActive || stopped || requestIdRef.current !== currentRequestId) return;
            pollTimer = window.setTimeout(async () => {
                if (!isActive || stopped || requestIdRef.current !== currentRequestId) return;
                try {
                    const nextStatus = await getAcademiaTranscriptionStatus(requestId);
                    if (!isActive || stopped || requestIdRef.current !== currentRequestId) return;
                    if (nextStatus) {
                        consecutiveErrors = 0;
                        updateLocalStatus(nextStatus);
                        if (nextStatus.phase === "completed" || nextStatus.phase === "failed") {
                            return;
                        }
                    } else {
                        // null = 404, job not found yet
                        consecutiveErrors += 1;
                        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                            return;
                        }
                    }
                } catch {
                    consecutiveErrors += 1;
                    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                        return;
                    }
                }
                scheduleStatusPoll(900);
            }, delayMs);
        };

        setRequestState("running");
        setUploadProgress(6);
        setErrorMessage("");
        setTranscript(null);
        updateLocalStatus(
            buildLocalStatus(requestId, mediaFile.name, 6, "Uploading media…", "uploading")
        );
        scheduleStatusPoll(700);

        void transcribeAcademiaMedia(mediaFile, {
            requestId,
            onProgress: (progress) => {
                if (!isActive || requestIdRef.current !== currentRequestId) return;
                setUploadProgress(progress);
                setTranscriptionStatus((currentStatus) => {
                    const activeStatus =
                        currentStatus ??
                        buildLocalStatus(requestId, mediaFile.name, progress, "Uploading media…", "uploading");
                    if (activeStatus.phase !== "uploading" || progress <= activeStatus.progressPercent) {
                        return activeStatus;
                    }
                    return {
                        ...activeStatus,
                        progressPercent: progress,
                        message: "Uploading media…",
                        updatedAt: new Date().toISOString(),
                    };
                });
            },
        })
            .then((result) => {
                if (!isActive || requestIdRef.current !== currentRequestId) return;
                stopPolling();
                writeCachedTranscript(mediaFile.name, result);
                setTranscript(result);
                setRequestState("ready");
                setUploadProgress(100);
                setErrorMessage("");
                setTranscriptionStatus(
                    buildLocalStatus(requestId, mediaFile.name, 100, "Transcript ready.", "completed")
                );
            })
            .catch((error) => {
                if (!isActive || requestIdRef.current !== currentRequestId) return;
                stopPolling();
                const message = getErrorMessage(error);
                setTranscript(null);
                setRequestState("error");
                setUploadProgress(100);
                setErrorMessage(message);
                setTranscriptionStatus((currentStatus) =>
                    buildLocalStatus(
                        requestId,
                        mediaFile.name,
                        currentStatus?.progressPercent ?? 100,
                        message,
                        "failed",
                        axios.isAxiosError(error)
                            ? (error.response?.data?.error ?? "TRANSCRIPT_FAILED")
                            : "TRANSCRIPT_FAILED"
                    )
                );
            });

        return () => {
            isActive = false;
            stopPolling();
        };
    }, [mediaFile]);

    const isTranscriptionRunning = requestState === "running";
    const transcriptProgress =
        transcriptionStatus?.progressPercent ?? (requestState === "ready" ? 100 : 0);

    return {
        requestState,
        uploadProgress,
        errorMessage,
        transcript,
        transcriptionStatus,
        isTranscriptionRunning,
        transcriptProgress,
    };
}
