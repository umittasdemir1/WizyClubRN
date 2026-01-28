/**
 * useFeedConfig - Feed Configuration & Constants
 *
 * Centralized configuration for all feed-related components.
 * Contains:
 * - UI layer toggle flags (for testing)
 * - Dimension constants
 * - Viewability configuration
 * - Timing constants
 *
 * @module presentation/components/feed/hooks/useFeedConfig
 */

import { Dimensions } from 'react-native';

// ============================================================================
// FEED FLAGS - UI Layer Toggle System
// ============================================================================

/**
 * Global UI kill switches for testing and debugging.
 * Set DISABLE_ALL to true to disable all UI layers at once.
 * Individual flags can be toggled independently when DISABLE_ALL is false.
 */
export const FEED_FLAGS = {
    /** Master switch - disables all UI when true */
    DISABLE_ALL: false,

    /** Disables scroll-based active video changes */
    DISABLE_SCROLL_HANDLING: false,

    /** Disables tap, double-tap, long-press interactions */
    DISABLE_INTERACTIONS: false,

    /** Disables like, save, share, follow actions */
    DISABLE_ACTIONS: false,

    /** Disables header, story bar, sheets, modals */
    DISABLE_OVERLAYS: false,

    // Legacy flags (kept for backward compatibility)
    /** Disables all feed UI for testing video rendering */
    DISABLE_FEED_UI_FOR_TEST: false,

    /** Disables ActiveVideoOverlay component */
    DISABLE_ACTIVE_VIDEO_OVERLAY: false,

    /** Disables global overlays (header, sheets, modals) */
    DISABLE_GLOBAL_OVERLAYS: false,

    /** Disables non-active UI elements */
    DISABLE_NON_ACTIVE_UI: false,
} as const;

/**
 * Helper function to check if a feature is disabled.
 * Respects DISABLE_ALL as master switch.
 *
 * @param flag - The flag key to check
 * @returns true if the feature is disabled
 */
export const isDisabled = (flag: keyof typeof FEED_FLAGS): boolean => {
    if (FEED_FLAGS.DISABLE_ALL) return true;
    return FEED_FLAGS[flag];
};

// ============================================================================
// DIMENSION CONSTANTS
// ============================================================================

/** Screen width in pixels */
export const SCREEN_WIDTH = Dimensions.get('window').width;

/** Screen height in pixels (used as item height for full-screen videos) */
export const SCREEN_HEIGHT = Dimensions.get('window').height;

/** Height of each feed item (full screen) */
export const ITEM_HEIGHT = SCREEN_HEIGHT;

// ============================================================================
// FEED CONFIGURATION
// ============================================================================

/**
 * Core feed configuration constants.
 * Centralized to allow easy tuning and testing.
 */
export const FEED_CONFIG = {
    /** Maximum times a video will loop before showing finish state */
    MAX_VIDEO_LOOPS: 2,

    /** Debounce time for loop detection (prevents double-counting) */
    LOOP_DEBOUNCE_MS: 1000,

    /** Debounce time after scroll ends before processing taps */
    SCROLL_END_DEBOUNCE_MS: 150,

    /** Block time after double-tap to ignore single taps */
    DOUBLE_TAP_BLOCK_MS: 300,

    /** Auto-advance threshold in "fast" viewing mode (seconds) */
    FAST_MODE_AUTO_ADVANCE_THRESHOLD: 10,

    /** Number of videos to prefetch ahead of current position */
    PREFETCH_AHEAD_COUNT: 3,

    /** Number of videos to prefetch behind current position */
    PREFETCH_BEHIND_COUNT: 1,

    /** Number of players in the recycling pool */
    POOL_SIZE: 3,

    /** Maximum retries for video playback errors */
    MAX_RETRIES: 3,

    /** Delay before recycling slots after scroll ends (ms) */
    RECYCLE_DELAY_MS: 100,

    /** Delay before retrying a failed video (ms) */
    RETRY_DELAY_MS: 300,

    /** Aspect ratio threshold to switch between cover and contain */
    ASPECT_RATIO_THRESHOLD: 0.8,
} as const;

// ============================================================================
// VIEWABILITY CONFIGURATION
// ============================================================================

/**
 * FlashList viewability configuration.
 * Determines when a video is considered "active" based on visibility.
 */
export const VIEWABILITY_CONFIG = {
    /** Percentage of item that must be visible to trigger callback */
    itemVisiblePercentThreshold: 40,

    /** Minimum time (ms) item must be visible before triggering */
    minimumViewTime: 50,
} as const;

/** Viewability threshold as decimal (0-1) */
export const VIEWABILITY_THRESHOLD = VIEWABILITY_CONFIG.itemVisiblePercentThreshold / 100;

// ============================================================================
// COLOR CONSTANTS
// ============================================================================

/**
 * Feed-specific color constants.
 */
export const FEED_COLORS = {
    /** Active save icon color */
    SAVE_ICON_ACTIVE: '#FFFFFF',

    /** Toast background color */
    TOAST_BACKGROUND: 'rgba(0, 0, 0, 0.8)',

    /** Overlay gradient start */
    GRADIENT_START: 'rgba(0, 0, 0, 0.1)',

    /** Overlay gradient end */
    GRADIENT_END: 'rgba(0, 0, 0, 0.7)',
} as const;

// ============================================================================
// Z-INDEX LAYERS
// ============================================================================

/**
 * Z-index values for feed layer architecture.
 * Ensures consistent stacking order across components.
 */
export const FEED_Z_INDEX = {
    /** Video player pool layer */
    VIDEO_LAYER: 1,

    /** Brightness overlay */
    BRIGHTNESS_OVERLAY: 2,

    /** FlashList scroll detection layer */
    SCROLL_LAYER: 5,

    /** Active video UI overlay */
    ACTIVE_OVERLAY: 50,

    /** Header overlay */
    HEADER: 100,

    /** Story bar */
    STORY_BAR: 101,

    /** Bottom sheets */
    SHEETS: 200,

    /** Modals */
    MODALS: 300,

    /** Toast notifications */
    TOAST: 400,
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type FeedFlagKey = keyof typeof FEED_FLAGS;
export type FeedConfigKey = keyof typeof FEED_CONFIG;
