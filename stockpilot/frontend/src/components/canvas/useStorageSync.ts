import { useEffect, useRef } from "react";
import type { ColumnOverride, CustomMetricDefinition, PivotFieldId, PivotTableInstance } from "./canvasModel";
import { persistStudioState } from "./canvasStorage";

interface StorageSyncState {
    tables: PivotTableInstance[];
    activeTableId: string | null;
    customMetrics: CustomMetricDefinition[];
    pinnedFieldIds: PivotFieldId[];
    columnOverrides: Record<string, ColumnOverride>;
}

export function useStorageSync(state: StorageSyncState) {
    const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const { tables, activeTableId, customMetrics, pinnedFieldIds, columnOverrides } = state;
        if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
        persistTimerRef.current = setTimeout(
            () => persistStudioState({ tables, activeTableId, customMetrics, pinnedFieldIds, columnOverrides }),
            500
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.tables, state.activeTableId, state.customMetrics, state.pinnedFieldIds, state.columnOverrides]);
}
