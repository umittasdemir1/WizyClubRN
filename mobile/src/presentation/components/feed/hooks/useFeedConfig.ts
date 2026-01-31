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
// FEED FLAGS - Normalized UI Control System
// ============================================================================

/**
 * Global flags to control feed layers and logic. 
 * Separated into Core Logic (essential functionality) and UI Layers (visual only).
 * 
 * DESIGN RULES:
 * 1. CORE_LOGIC flags are never affected by MASTER switches (DISABLE_ALL_UI).
 * 2. Each UI layer has exactly one controlling flag.
 * 3. Master switches only affect UI_LAYER flags to ensure deterministic testability.
 */
export const FEED_FLAGS = {
    // --- CORE LOGIC FLAGS (Deterministic Behavior) ---
    /** Disables scroll-based active video index management */
    DISABLE_SCROLL_HANDLING: false,
    /** Disables all user interactions (tap, longpress, swipes) */
    DISABLE_INTERACTION_HANDLING: false,

    // --- FEED MODE FLAGS ---
    /** Use Infinite Feed (X/Instagram style) instead of Pool-based TikTok feed */
    USE_INFINITE_FEED: true,

    // ═══════════════════════════════════════════════════════════════════════
    // INFINITE FEED FLAGS (Only applies when USE_INFINITE_FEED is true)
    // ═══════════════════════════════════════════════════════════════════════
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
    INF_DISABLE_ACTION_ANIMATIONS: false,
    /** Disable header tabs (Senin İçin / Takip) */
    INF_DISABLE_HEADER_TABS: true,
    /** Disable thumbnail/poster display during video loading */
    INF_DISABLE_THUMBNAIL: false,

    // ═══════════════════════════════════════════════════════════════════════
    // POOL PLAYER FLAGS (Only applies when USE_INFINITE_FEED is false)
    // ═══════════════════════════════════════════════════════════════════════
    // --- UI LAYER FLAGS (Pure Visual Overlays) ---
    /** Master switch - Disables all visual UI layers (excluding video itself) */
    DISABLE_ALL_UI: false,

    // Active Video Overlay Granular Controls
    /** Disables the profile picture in metadata */
    DISABLE_AVATAR: false,
    /** Disables the user's full name/display name */
    DISABLE_FULL_NAME: false,
    /** Disables the @username handle */
    DISABLE_USERNAME: false,
    /** Disables the video description/caption */
    DISABLE_DESCRIPTION: false,
    /** Disables the video progression seekbar */
    DISABLE_SEEKBAR: false,
    /** Disables action buttons (Like, Save, Share, Shop) */
    DISABLE_ACTION_BUTTONS: false,
    /** Disables the commercial/sponsored tag */
    DISABLE_COMMERCIAL_TAG: false,

    // Global Overlays
    /** Master switch for the entire active video overlay layer */
    DISABLE_ACTIVE_VIDEO_OVERLAY: false,
    /** Disables the top navigation and status bar overlay */
    DISABLE_HEADER_OVERLAY: false,
    /** Disables the horizontal story carousel layer */
    DISABLE_STORY_BAR: false,
    /** Disables all bottom sheet components (More, Description, Shopping) */
    DISABLE_SHEETS: false,
    /** Disables all pop-up confirmation and info modals */
    DISABLE_MODALS: false,
    /** Disables save, error, and status toast notifications */
    DISABLE_TOASTS: false,

    // --- ALIASES & LEGACY WRAPPERS (Migration Support) ---
    /** Legacy alias: Targets overall UI test mode */
    DISABLE_FEED_UI_FOR_TEST: false,
} as const;

/**
 * Deterministic helper to check if a feature or layer is disabled.
 * Ensures consistent behavior by isolating core logic from UI master switches.
 *
 * @param flag - The specific flag key from FEED_FLAGS
 * @returns boolean - true if the feature is disabled
 */
export const isDisabled = (flag: keyof typeof FEED_FLAGS): boolean => {
    // Core Logic protection: Never allow master switches to break core functionality
    const isCoreLogic = flag === 'DISABLE_SCROLL_HANDLING' || flag === 'DISABLE_INTERACTION_HANDLING';

    // Global UI kill-switches (Only affect visual layers)
    const isMasterUISwitchActive = FEED_FLAGS.DISABLE_ALL_UI || FEED_FLAGS.DISABLE_FEED_UI_FOR_TEST;

    if (!isCoreLogic && isMasterUISwitchActive) {
        return true;
    }

    // Direct flag check
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
