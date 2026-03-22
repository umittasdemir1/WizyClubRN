import {
    STORAGE_KEY,
    sanitizeStudioState,
    type ColumnOverride,
    type CustomMetricDefinition,
    type PivotFieldId,
    type PivotTableInstance
} from "./canvasModel";

interface PersistedStudioState {
    tables: PivotTableInstance[];
    activeTableId: string | null;
    customMetrics: CustomMetricDefinition[];
    pinnedFieldIds: PivotFieldId[];
    columnOverrides: Record<string, ColumnOverride>;
}

// 4.4: In-memory fallback when localStorage is unavailable (e.g. private browsing)
let memoryFallback: Map<string, string> | null = null;

function getStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
    try {
        window.localStorage.setItem("__probe__", "1");
        window.localStorage.removeItem("__probe__");
        return window.localStorage;
    } catch {
        console.warn("[canvasStorage] localStorage unavailable — using in-memory fallback.");
        if (!memoryFallback) {
            memoryFallback = new Map();
        }
        return {
            getItem: (key) => memoryFallback!.get(key) ?? null,
            setItem: (key, value) => { memoryFallback!.set(key, value); },
            removeItem: (key) => { memoryFallback!.delete(key); }
        };
    }
}

export function loadStudioState(): PersistedStudioState {
    const storage = getStorage();
    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) {
            return sanitizeStudioState(null);
        }
        return sanitizeStudioState(JSON.parse(raw));
    } catch {
        storage.removeItem(STORAGE_KEY);
        return sanitizeStudioState(null);
    }
}

export function persistStudioState(state: PersistedStudioState) {
    getStorage().setItem(STORAGE_KEY, JSON.stringify(state));
}
