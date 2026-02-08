/**
 * useInfiniteFeedConfig - Infinite Feed specific flags and constants
 *
 * This file intentionally duplicates Infinite-related feed configuration so
 * infinite components no longer depend on pool feed config files.
 */

export const INFINITE_FEED_FLAGS = {
    /** Master switch for all InfiniteFeed overlays */
    INF_DISABLE_ALL_UI: false,
    /** Disable video playback in feed (show only thumbnails) */
    INF_DISABLE_INLINE_VIDEO: false,
    /** Disable user header (avatar + name + handle) */
    INF_DISABLE_USER_HEADER: false,
    /** Disable action buttons row (like, save, share, shop) */
    INF_DISABLE_ACTIONS: false,
    /** Disable description text */
    INF_DISABLE_DESCRIPTION: false,
    /** Disable action button animations (particle burst, heartbeat) */
    INF_DISABLE_ACTION_ANIMATIONS: true,
    /** Disable header tabs (Senin Icin / Takip) */
    INF_DISABLE_HEADER_TABS: false,
    /** Disable thumbnail/poster display during video loading */
    INF_DISABLE_THUMBNAIL: false,
    /** Commit active item immediately on viewability change (no settle wait) */
    INF_ACTIVE_COMMIT_ON_VIEWABLE: true,
    /** Disable Card Style (Edge-to-Edge full width view) */
    INF_DISABLE_CARD_STYLE: true,
} as const;

export const INFINITE_FEED_CONFIG = {
    /** Number of videos to prefetch ahead of current position (network/disk warmup) */
    PREFETCH_AHEAD_COUNT: 6,
    /** Number of videos to prefetch behind current position */
    PREFETCH_BEHIND_COUNT: 0,
    /** Number of next videos to mount for decode pre-warm (paused at first frame) */
    DECODE_PREWARM_AHEAD_COUNT: 2,
    /** Number of nearest candidates allowed to actively decode-prewarm at once */
    DECODE_PREWARM_PLAY_COUNT: 1,
    /** Active playback starts when item visibility reaches this percent */
    PLAY_VISIBILITY_THRESHOLD_PERCENT: 30,
} as const;

// Backward-compatible names for minimal migration churn in infinite components.
export const FEED_FLAGS = INFINITE_FEED_FLAGS;
export const FEED_CONFIG = INFINITE_FEED_CONFIG;

export type InfiniteFeedFlagKey = keyof typeof INFINITE_FEED_FLAGS;
export type InfiniteFeedConfigKey = keyof typeof INFINITE_FEED_CONFIG;
