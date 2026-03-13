import { STORAGE_KEY, sanitizeStudioState, type PivotTableInstance } from "./canvasModel";

interface PersistedStudioState {
    tables: PivotTableInstance[];
    activeTableId: string | null;
}

export function loadStudioState(): PersistedStudioState {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return sanitizeStudioState(null);
        }

        return sanitizeStudioState(JSON.parse(raw));
    } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        return sanitizeStudioState(null);
    }
}

export function persistStudioState(state: PersistedStudioState) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
