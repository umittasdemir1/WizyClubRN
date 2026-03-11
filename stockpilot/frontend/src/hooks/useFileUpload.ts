import { useMutation } from "@tanstack/react-query";
import { analyzeInventoryApi, getTransferPlanApi, uploadInventoryFile } from "../services/api";
import { parseInventoryFile } from "../services/parser";
import { analyzeInventory, buildTransferPlan } from "../utils/analysis";
import type { UploadStage, UploadWorkflowResult } from "../types/stock";

interface UseFileUploadOptions {
    onProgressChange?: (progress: number) => void;
    onStageChange?: (stage: UploadStage) => void;
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
                const parsed = await uploadInventoryFile(file, reportProgress);
                options.onStageChange?.("analyzing");
                reportProgress(78);
                const [analysis, transferPlan] = await Promise.all([
                    analyzeInventoryApi(parsed.records),
                    getTransferPlanApi(parsed.records)
                ]);
                reportProgress(100);
                options.onStageChange?.("ready");

                return {
                    parsed,
                    analysis,
                    transferPlan,
                    source: "api"
                };
            } catch {
                options.onStageChange?.("local-processing");
                reportProgress(28);
                const parsed = await parseInventoryFile(file);
                reportProgress(72);
                const analysis = analyzeInventory(parsed.records);
                const transferPlan = buildTransferPlan(parsed.records);
                reportProgress(100);
                options.onStageChange?.("ready");

                return {
                    parsed,
                    analysis,
                    transferPlan,
                    source: "local"
                };
            }
        }
    });
}
