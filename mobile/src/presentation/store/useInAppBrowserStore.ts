import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BrowserHistoryEntry = {
    url: string;
    title?: string;
    timestamp: number;
};

interface InAppBrowserState {
    historyEnabled: boolean;
    history: BrowserHistoryEntry[];
    isVisible: boolean;
    currentUrl: string | null;
    setHistoryEnabled: (enabled: boolean) => void;
    addHistoryEntry: (entry: BrowserHistoryEntry) => void;
    clearHistory: () => void;
    openUrl: (url: string) => void;
    close: () => void;
}

const MAX_HISTORY = 100;

export const useInAppBrowserStore = create<InAppBrowserState>()(
    persist(
        (set, get) => ({
            historyEnabled: true,
            history: [],
            isVisible: false,
            currentUrl: null,
            setHistoryEnabled: (enabled) => set({ historyEnabled: enabled }),
            addHistoryEntry: (entry) => {
                if (!get().historyEnabled) return;
                set((state) => {
                    const existing = state.history[0];
                    if (existing && existing.url === entry.url) {
                        const updated = [{ ...existing, ...entry }, ...state.history.slice(1)];
                        return { history: updated };
                    }
                    const nextHistory = [entry, ...state.history].slice(0, MAX_HISTORY);
                    return { history: nextHistory };
                });
            },
            clearHistory: () => set({ history: [] }),
            openUrl: (url) => set({ currentUrl: url, isVisible: true }),
            close: () => set({ isVisible: false }),
        }),
        {
            name: 'wizyclub-inapp-browser',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                historyEnabled: state.historyEnabled,
                history: state.history,
            }),
        }
    )
);
