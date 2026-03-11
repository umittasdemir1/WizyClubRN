import { useMutation } from "@tanstack/react-query";
import { analyzeInventoryApi, getTransferPlanApi, uploadInventoryFile } from "../services/api";
import { parseInventoryFile } from "../services/parser";
import { analyzeInventory, buildTransferPlan } from "../utils/analysis";
import type { UploadWorkflowResult } from "../types/stock";

export function useFileUpload() {
    return useMutation({
        mutationFn: async (file: File): Promise<UploadWorkflowResult> => {
            try {
                const parsed = await uploadInventoryFile(file);
                const [analysis, transferPlan] = await Promise.all([
                    analyzeInventoryApi(parsed.records),
                    getTransferPlanApi(parsed.records)
                ]);

                return {
                    parsed,
                    analysis,
                    transferPlan,
                    source: "api"
                };
            } catch {
                const parsed = await parseInventoryFile(file);
                const analysis = analyzeInventory(parsed.records);
                const transferPlan = buildTransferPlan(parsed.records);

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
