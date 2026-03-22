import { useState, useMemo, useRef, useEffect } from "react";
import {
    type ColumnOverride,
    type CustomMetricFormat,
} from "./canvasModel";
import type { ColumnMeta } from "../../types/stock";

export function useFieldFormatState(
    columns: ColumnMeta[],
    columnOverrides: Record<string, ColumnOverride>,
    updateColumnOverride: (key: string, override: ColumnOverride | null) => void
) {
    const [fieldEditorSort, setFieldEditorSort] = useState<{ key: "field" | "label" | "type" | "format"; direction: "asc" | "desc" } | null>(null);
    const [pendingOverrides, setPendingOverrides] = useState<Record<string, { label: string; typeOverride?: "text" | "numeric" | "date"; format: CustomMetricFormat }>>({});
    const [savedRows, setSavedRows] = useState<Set<string>>(new Set());
    const savedTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    function flashSaved(key: string) {
        if (savedTimeoutsRef.current[key]) clearTimeout(savedTimeoutsRef.current[key]);
        setSavedRows((prev) => new Set([...prev, key]));
        savedTimeoutsRef.current[key] = setTimeout(() => {
            setSavedRows((prev) => { const next = new Set(prev); next.delete(key); return next; });
        }, 1800);
    }

    const sortedColumns = useMemo(() => {
        if (!fieldEditorSort) return columns;
        return [...columns].sort((a, b) => {
            let aVal: string, bVal: string;
            const ak = fieldEditorSort.key;
            if (ak === "field") { aVal = a.key; bVal = b.key; }
            else if (ak === "label") { aVal = columnOverrides[a.key]?.label ?? a.label; bVal = columnOverrides[b.key]?.label ?? b.label; }
            else if (ak === "type") { aVal = columnOverrides[a.key]?.typeOverride ?? a.type; bVal = columnOverrides[b.key]?.typeOverride ?? b.type; }
            else { aVal = columnOverrides[a.key]?.format ?? ""; bVal = columnOverrides[b.key]?.format ?? ""; }
            const cmp = aVal.localeCompare(bVal);
            return fieldEditorSort.direction === "asc" ? cmp : -cmp;
        });
    }, [columns, columnOverrides, fieldEditorSort]);

    function onToggleSort(key: "field" | "label" | "type" | "format") {
        setFieldEditorSort((prev) => {
            if (!prev || prev.key !== key) return { key, direction: "asc" };
            if (prev.direction === "asc") return { key, direction: "desc" };
            return null;
        });
    }

    function onUpdatePending(key: string, col: ColumnMeta, patch: Partial<{ label: string; typeOverride: "text" | "numeric" | "date"; format: CustomMetricFormat }>) {
        setPendingOverrides((prev) => {
            const committed = columnOverrides[key];
            const current = prev[key] ?? {
                label: committed?.label ?? col.label,
                ...(committed?.typeOverride ? { typeOverride: committed.typeOverride } : {}),
                format: (committed?.format ?? "integer") as CustomMetricFormat
            };
            return { ...prev, [key]: { ...current, ...patch } };
        });
    }

    function onSaveRow(key: string) {
        const pending = pendingOverrides[key];
        if (!pending) return;
        const next: ColumnOverride = { label: pending.label, format: pending.format };
        if (pending.typeOverride) next.typeOverride = pending.typeOverride;
        updateColumnOverride(key, next);
        setPendingOverrides((prev) => { const n = { ...prev }; delete n[key]; return n; });
        flashSaved(key);
    }

    function onResetRow(key: string) {
        updateColumnOverride(key, null);
        setPendingOverrides((prev) => { const n = { ...prev }; delete n[key]; return n; });
    }

    function onResetAll() {
        Object.keys(columnOverrides).forEach((key) => updateColumnOverride(key, null));
        setPendingOverrides({});
    }

    return {
        fieldEditorSort,
        pendingOverrides,
        setPendingOverrides,
        savedRows,
        sortedColumns,
        onToggleSort,
        onUpdatePending,
        onSaveRow,
        onResetRow,
        onResetAll
    };
}
