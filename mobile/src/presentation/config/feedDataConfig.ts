/**
 * feedDataConfig - Shared data-layer feed tuning.
 *
 * Holds values used by feed fetching/prefetching logic independently from
 * pool/infinite UI component configs.
 */
export const FEED_DATA_CONFIG = {
    PREFETCH_AHEAD_COUNT: 3,
} as const;

export type FeedDataConfigKey = keyof typeof FEED_DATA_CONFIG;
