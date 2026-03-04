import { create } from 'zustand';

interface InfiniteFeedResolvedSourceState {
    sources: Record<string, string>;
    setResolvedSource: (videoId: string, source: string | null) => void;
    pruneResolvedSources: (validIds: string[]) => void;
    clearResolvedSources: () => void;
}

export const useInfiniteFeedResolvedSourceStore = create<InfiniteFeedResolvedSourceState>()((set) => ({
    sources: {},
    setResolvedSource: (videoId, source) => {
        set((state) => {
            const currentValue = state.sources[videoId];

            if (!source) {
                if (!(videoId in state.sources)) return state;
                const nextSources = { ...state.sources };
                delete nextSources[videoId];
                return { sources: nextSources };
            }

            if (currentValue === source) return state;

            return {
                sources: {
                    ...state.sources,
                    [videoId]: source,
                },
            };
        });
    },
    pruneResolvedSources: (validIds) => {
        const validIdSet = new Set(validIds);
        set((state) => {
            let changed = false;
            const nextSources: Record<string, string> = {};

            for (const [videoId, source] of Object.entries(state.sources)) {
                if (!validIdSet.has(videoId)) {
                    changed = true;
                    continue;
                }
                nextSources[videoId] = source;
            }

            if (!changed) return state;
            return { sources: nextSources };
        });
    },
    clearResolvedSources: () => set((state) => (
        Object.keys(state.sources).length === 0 ? state : { sources: {} }
    )),
}));
