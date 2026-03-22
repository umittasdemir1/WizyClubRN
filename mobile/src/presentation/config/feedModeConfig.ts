/**
 * feedModeConfig - Global feed mode switch.
 *
 * Keep mode selection outside pool/infinite component folders so the two
 * implementations stay decoupled.
 */
export const FEED_MODE_FLAGS = {
    USE_INFINITE_FEED: true,
} as const;

export type FeedModeFlagKey = keyof typeof FEED_MODE_FLAGS;
