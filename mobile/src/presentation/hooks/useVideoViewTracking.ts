import { useEffect } from 'react';
import { VideoRepositoryImpl } from '../../data/repositories/VideoRepositoryImpl';
import { RecordVideoViewUseCase } from '../../domain/usecases';
import { useVideoCounterStore } from '../store/useVideoCounterStore';

type UseVideoViewTrackingOptions = {
    videoId: string | null | undefined;
    userId: string | null | undefined;
    enabled: boolean;
    minViewMs?: number;
    cooldownMs?: number;
};

const DEFAULT_MIN_VIEW_MS = 2000;
const DEFAULT_VIEW_COOLDOWN_MS = 30 * 60 * 1000;
const MAX_RECENT_ENTRIES = 5000;

const recordVideoViewUseCase = new RecordVideoViewUseCase(new VideoRepositoryImpl());
const recentViewsByUserVideo = new Map<string, number>();

const maybePruneRecentViews = (now: number, cooldownMs: number) => {
    if (recentViewsByUserVideo.size <= MAX_RECENT_ENTRIES) return;

    for (const [key, timestamp] of recentViewsByUserVideo.entries()) {
        if (now - timestamp >= cooldownMs) {
            recentViewsByUserVideo.delete(key);
        }
    }
};

/**
 * Records watch history after a minimum active-view duration and applies
 * per-session cooldown to avoid duplicate inserts during rapid scrolling.
 */
export function useVideoViewTracking({
    videoId,
    userId,
    enabled,
    minViewMs = DEFAULT_MIN_VIEW_MS,
    cooldownMs = DEFAULT_VIEW_COOLDOWN_MS,
}: UseVideoViewTrackingOptions) {
    const applyVideoCounterDelta = useVideoCounterStore((state) => state.applyLocalCounterDelta);

    useEffect(() => {
        if (!enabled || !videoId || !userId) return;

        const safeMinViewMs = Number.isFinite(minViewMs) ? Math.max(0, Math.floor(minViewMs)) : DEFAULT_MIN_VIEW_MS;
        const safeCooldownMs = Number.isFinite(cooldownMs) ? Math.max(0, Math.floor(cooldownMs)) : DEFAULT_VIEW_COOLDOWN_MS;
        const cacheKey = `${userId}:${videoId}`;
        let isCancelled = false;

        const timer = setTimeout(() => {
            if (isCancelled) return;

            const now = Date.now();
            const lastRecordedAt = recentViewsByUserVideo.get(cacheKey) ?? 0;
            if (now - lastRecordedAt < safeCooldownMs) return;

            maybePruneRecentViews(now, safeCooldownMs);
            // Reserve cooldown slot immediately to prevent concurrent duplicate writes.
            recentViewsByUserVideo.set(cacheKey, now);
            void (async () => {
                const status = await recordVideoViewUseCase.execute(videoId, userId, { cooldownMs: safeCooldownMs });
                if (isCancelled) return;

                if (status === 'error') {
                    recentViewsByUserVideo.delete(cacheKey);
                    return;
                }

                if (status === 'inserted') {
                    applyVideoCounterDelta(videoId, 'viewsCount', 1);
                }

                // Refresh timestamp after successful insert or server-side cooldown skip.
                recentViewsByUserVideo.set(cacheKey, Date.now());
            })();
        }, safeMinViewMs);

        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [applyVideoCounterDelta, cooldownMs, enabled, minViewMs, userId, videoId]);
}
