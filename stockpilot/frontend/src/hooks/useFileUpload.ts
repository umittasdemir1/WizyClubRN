import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { uploadInventoryFile } from "../services/api";
import type { UploadStage, UploadWorkflowResult } from "../types/stock";

interface UseFileUploadOptions {
    onProgressChange?: (progress: number) => void;
    onStageChange?: (stage: UploadStage) => void;
}

function getUploadErrorMessage(error: unknown, fallbackMessage = "Upload workflow failed.") {
    if (isAxiosError(error)) {
        const responseMessage =
            typeof error.response?.data === "object" &&
            error.response?.data &&
            "message" in error.response.data &&
            typeof error.response.data.message === "string"
                ? error.response.data.message
                : null;

        if (responseMessage) {
            return responseMessage;
        }

        if (error.code === "ECONNABORTED") {
            return "The API request timed out before StockPilot could finish processing the file.";
        }

        if (error.response?.status === 504) {
            return "The StockPilot API timed out while processing the file.";
        }

        if (error.response?.status === 502 || error.response?.status === 503) {
            return "The StockPilot API is temporarily unavailable.";
        }

        if (error.code === "ERR_NETWORK" || !error.response) {
            return "StockPilot could not reach the API and local processing also failed.";
        }

        return error.message || fallbackMessage;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallbackMessage;
}

function shouldUseLocalFallback(error: unknown) {
    return (
        isAxiosError(error) &&
        (
            error.code === "ERR_NETWORK" ||
            error.code === "ECONNABORTED" ||
            !error.response ||
            error.response.status >= 500
        )
    );
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
    const reportProgress = (progress: number) => {
        options.onProgressChange?.(Math.max(0, Math.min(100, progress)));
    };

    return useMutation({
        mutationFn: async (file: File): Promise<UploadWorkflowResult> => {
            options.onStageChange?.("uploading");
            reportProgress(0);

            try {
                const result = await uploadInventoryFile(file, reportProgress);
                reportProgress(100);
                options.onStageChange?.("ready");
                return result;
            } catch (error) {
                if (!shouldUseLocalFallback(error)) {
                    options.onStageChange?.("idle");
                    reportProgress(0);
                    throw new Error(getUploadErrorMessage(error));
                }

                options.onStageChange?.("local-processing");
                reportProgress(28);

                try {
                    const [{ parseInventoryFile }, localAnalysisModule] = await Promise.all([
                        import("../services/parser"),
                        import("../utils/analysis")
                    ]);
                    const parsed = await parseInventoryFile(file);
                    reportProgress(72);
                    const analysis = localAnalysisModule.analyzeInventory(parsed.records);
                    const transferPlan = localAnalysisModule.buildTransferPlan(parsed.records);
                    reportProgress(100);
                    options.onStageChange?.("ready");

                    return {
                        parsed: {
                            fileName: parsed.fileName,
                            columns: parsed.columns,
                            rowCount: parsed.rowCount
                        },
                        analysis,
                        transferPlan,
                        source: "local"
                    };
                } catch (fallbackError) {
                    options.onStageChange?.("idle");
                    reportProgress(0);
                    throw new Error(getUploadErrorMessage(fallbackError, "Local processing failed."));
                }
            }
        }
    });
}
