import { create } from 'zustand';
import { Video } from '../../domain/entities/Video';

export type VideoCounterField =
    | 'likesCount'
    | 'savesCount'
    | 'viewsCount'
    | 'sharesCount'
    | 'shopsCount';

export interface VideoCounterSnapshot {
    likesCount: number;
    savesCount: number;
    viewsCount: number;
    sharesCount: number;
    shopsCount: number;
}

interface VideoCounterState {
    countersByVideoId: Record<string, VideoCounterSnapshot>;
    lastLocalUpdateByVideoId: Record<string, number>;
    syncFromServer: (videos: Video[]) => void;
    applyLocalCounterDelta: (videoId: string, field: VideoCounterField, delta: number) => void;
    reset: () => void;
}

const LOCAL_SYNC_PROTECTION_MS = 5000;

const toSafeCount = (value: unknown): number => {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.floor(numeric));
};

const toSnapshot = (video: Video): VideoCounterSnapshot => ({
    likesCount: toSafeCount(video.likesCount),
    savesCount: toSafeCount(video.savesCount),
    viewsCount: toSafeCount(video.viewsCount ?? 0),
    sharesCount: toSafeCount(video.sharesCount),
    shopsCount: toSafeCount(video.shopsCount),
});

const isSameSnapshot = (a: VideoCounterSnapshot | undefined, b: VideoCounterSnapshot): boolean => {
    if (!a) return false;
    return (
        a.likesCount === b.likesCount &&
        a.savesCount === b.savesCount &&
        a.viewsCount === b.viewsCount &&
        a.sharesCount === b.sharesCount &&
        a.shopsCount === b.shopsCount
    );
};

const clampWithDelta = (current: number, delta: number): number => {
    const next = current + delta;
    if (!Number.isFinite(next)) return current;
    return Math.max(0, Math.floor(next));
};

export const useVideoCounterStore = create<VideoCounterState>((set, get) => ({
    countersByVideoId: {},
    lastLocalUpdateByVideoId: {},

    syncFromServer: (videos) => {
        if (!Array.isArray(videos) || videos.length === 0) return;
        const now = Date.now();

        set((state) => {
            let nextCounters = state.countersByVideoId;
            let didChange = false;

            for (const video of videos) {
                if (!video?.id) continue;

                const lastLocalUpdate = state.lastLocalUpdateByVideoId[video.id] ?? 0;
                if (now - lastLocalUpdate < LOCAL_SYNC_PROTECTION_MS) {
                    continue;
                }

                const snapshot = toSnapshot(video);
                if (isSameSnapshot(nextCounters[video.id], snapshot)) {
                    continue;
                }

                if (!didChange) {
                    nextCounters = { ...state.countersByVideoId };
                    didChange = true;
                }
                nextCounters[video.id] = snapshot;
            }

            if (!didChange) return state;
            return { countersByVideoId: nextCounters };
        });
    },

    applyLocalCounterDelta: (videoId, field, delta) => {
        if (!videoId || !Number.isFinite(delta) || delta === 0) return;
        const now = Date.now();

        set((state) => {
            const baseSnapshot = state.countersByVideoId[videoId] ?? {
                likesCount: 0,
                savesCount: 0,
                viewsCount: 0,
                sharesCount: 0,
                shopsCount: 0,
            };

            const currentValue = baseSnapshot[field];
            const nextValue = clampWithDelta(currentValue, delta);
            const sameValue = nextValue === currentValue;
            const sameTimestamp = state.lastLocalUpdateByVideoId[videoId] === now;
            if (sameValue && sameTimestamp) return state;

            return {
                countersByVideoId: {
                    ...state.countersByVideoId,
                    [videoId]: {
                        ...baseSnapshot,
                        [field]: nextValue,
                    },
                },
                lastLocalUpdateByVideoId: {
                    ...state.lastLocalUpdateByVideoId,
                    [videoId]: now,
                },
            };
        });
    },

    reset: () => {
        const current = get();
        if (
            Object.keys(current.countersByVideoId).length === 0 &&
            Object.keys(current.lastLocalUpdateByVideoId).length === 0
        ) {
            return;
        }

        set({
            countersByVideoId: {},
            lastLocalUpdateByVideoId: {},
        });
    },
}));

export const applyCounterSnapshotToVideo = <T extends Video>(
    video: T,
    countersByVideoId: Record<string, VideoCounterSnapshot>
): T => {
    const snapshot = countersByVideoId[video.id];
    if (!snapshot) return video;

    const nextLikes = toSafeCount(snapshot.likesCount);
    const nextSaves = toSafeCount(snapshot.savesCount);
    const nextViews = toSafeCount(snapshot.viewsCount);
    const nextShares = toSafeCount(snapshot.sharesCount);
    const nextShops = toSafeCount(snapshot.shopsCount);

    const likesChanged = toSafeCount(video.likesCount) !== nextLikes;
    const savesChanged = toSafeCount(video.savesCount) !== nextSaves;
    const viewsChanged = toSafeCount(video.viewsCount ?? 0) !== nextViews;
    const sharesChanged = toSafeCount(video.sharesCount) !== nextShares;
    const shopsChanged = toSafeCount(video.shopsCount) !== nextShops;

    if (!likesChanged && !savesChanged && !viewsChanged && !sharesChanged && !shopsChanged) {
        return video;
    }

    return {
        ...video,
        likesCount: nextLikes,
        savesCount: nextSaves,
        viewsCount: nextViews,
        sharesCount: nextShares,
        shopsCount: nextShops,
    };
};
