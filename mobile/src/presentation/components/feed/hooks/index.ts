/**
 * Feed Hooks Index
 *
 * Re-exports all feed-specific hooks for convenient importing.
 *
 * @module presentation/components/feed/hooks
 */

// Configuration & Constants
export {
    FEED_FLAGS,
    FEED_CONFIG,
    VIEWABILITY_CONFIG,
    VIEWABILITY_THRESHOLD,
    FEED_COLORS,
    FEED_Z_INDEX,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    ITEM_HEIGHT,
    isDisabled,
    type FeedFlagKey,
    type FeedConfigKey,
} from './useFeedConfig';

// Scroll Management
export {
    useFeedScroll,
    type UseFeedScrollOptions,
    type UseFeedScrollReturn,
} from './useFeedScroll';

// Gesture & Interactions
export {
    useFeedInteractions,
    type UseFeedInteractionsOptions,
    type UseFeedInteractionsReturn,
} from './useFeedInteractions';

// Actions
export {
    useFeedActions,
    type UseFeedActionsOptions,
    type UseFeedActionsReturn,
} from './useFeedActions';
