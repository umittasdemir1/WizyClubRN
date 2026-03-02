/**
 * feedDataConfig — Single source of truth for prefetch tuning.
 *
 * Previously split across 3 files (feedDataConfig, usePoolFeedConfig,
 * useInfiniteFeedConfig) with inconsistent values (3, 3, 6).
 * Now unified here. All feed types import from this file.
 *
 * Tuning guide:
 *   PREFETCH_AHEAD_COUNT  – How many videos to download ahead of current
 *   PREFETCH_BEHIND_COUNT – How many videos to keep/download behind current
 *   Higher values = more bandwidth usage, fewer cache misses
 *   Lower values  = less bandwidth, more "Slow video transition" logs
 */
export const FEED_DATA_CONFIG = {
    /** Videos to prefetch ahead (network/disk warmup) */
    PREFETCH_AHEAD_COUNT: 4,
    /** Videos to prefetch behind current position */
    PREFETCH_BEHIND_COUNT: 1,
} as const;

export type FeedDataConfigKey = keyof typeof FEED_DATA_CONFIG;
