/**
 * useFeedScroll - Feed Scroll Management Hook
 *
 * Handles all scroll-related logic for the feed:
 * - Reanimated scroll handler (worklet)
 * - Viewability tracking
 * - Active video selection
 * - Prefetch index calculation
 *
 * @module presentation/components/feed/hooks/useFeedScroll
 */

import { useCallback, useRef } from 'react';
import { useSharedValue, useAnimatedScrollHandler, SharedValue } from 'react-native-reanimated';
import type { ViewToken } from 'react-native';
import { Image } from 'expo-image';
import {
    ITEM_HEIGHT,
    VIEWABILITY_CONFIG,
    VIEWABILITY_THRESHOLD,
    FEED_FLAGS,
} from './useFeedConfig';
import { Video } from '../../../../domain/entities/Video';
import { VideoCacheService } from '../../../../data/services/VideoCacheService';
import { FeedPrefetchService } from '../../../../data/services/FeedPrefetchService';
import { getVideoUrl } from '../../../../core/utils/videoUrl';

// ============================================================================
// Types
// ============================================================================

export interface UseFeedScrollOptions {
    /** Videos array reference (use useRef for stable reference) */
    videosRef: React.MutableRefObject<Video[]>;
    /** Callback to set active video in store */
    setActiveVideo: (id: string, index: number) => void;
    /** Callback to set clean screen state */
    setCleanScreen: (value: boolean) => void;
    /** Callback to set active tab */
    setActiveTab: (tab: 'stories' | 'foryou') => void;
    /** Callback to set carousel interacting state */
    setIsCarouselInteracting: (value: boolean) => void;
    /** Last active video ID reference */
    lastActiveIdRef: React.MutableRefObject<string | null>;
    /** Last internal index reference */
    lastInternalIndex: React.MutableRefObject<number>;
}

export interface UseFeedScrollReturn {
    /** Reanimated scroll handler for FlashList */
    scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
    /** Callback for FlashList viewable items change */
    onViewableItemsChanged: (info: { viewableItems: ViewToken<Video>[] }) => void;
    /** Set active video from index */
    setActiveFromIndex: (newIndex: number) => void;
    /** Get prefetch indices for a given index */
    getPrefetchIndices: (newIndex: number) => number[];
    /** Handle scroll end event */
    handleScrollEnd: (event: any, videosLength: number, listRef: React.RefObject<any>) => void;
    /** Current scroll Y position (SharedValue) */
    scrollY: SharedValue<number>;
    /** Whether currently scrolling (SharedValue) */
    isScrollingSV: SharedValue<boolean>;
    /** Viewability config callback pairs for FlashList */
    viewabilityConfigCallbackPairs: React.MutableRefObject<Array<{
        viewabilityConfig: typeof VIEWABILITY_CONFIG;
        onViewableItemsChanged: (info: { viewableItems: ViewToken<Video>[] }) => void;
    }>>;
    /** Last viewable index reference */
    lastViewableIndexRef: React.MutableRefObject<number>;
    /** Last viewable timestamp reference */
    lastViewableTsRef: React.MutableRefObject<number>;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a video item is a playable video (not a carousel)
 */
const isFeedVideoItem = (video?: Video | null): boolean => {
    if (!video) return false;
    if (video.postType === 'carousel') return false;
    return Boolean(getVideoUrl(video));
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook for managing feed scroll behavior.
 *
 * @param options - Configuration options for the hook
 * @returns Scroll handlers, callbacks, and shared values
 */
export function useFeedScroll(options: UseFeedScrollOptions): UseFeedScrollReturn {
    const {
        videosRef,
        setActiveVideo,
        setCleanScreen,
        setActiveTab,
        setIsCarouselInteracting,
        lastActiveIdRef,
        lastInternalIndex,
    } = options;

    // ========================================================================
    // SharedValues for video/UI sync (0ms latency)
    // ========================================================================
    const scrollY = useSharedValue(0);
    const isScrollingSV = useSharedValue(false);

    // ========================================================================
    // Refs for tracking viewability
    // ========================================================================
    const lastViewableIndexRef = useRef(0);
    const lastViewableTsRef = useRef(0);

    // ========================================================================
    // Scroll Handler (Reanimated Worklet)
    // ========================================================================
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event: any) => {
            // Only update scrollY (critical for video positioning)
            // All other state updates moved to JS callbacks to reduce worklet load
            scrollY.value = event.contentOffset.y;
        },
        onBeginDrag: () => {
            isScrollingSV.value = true;
        },
        onMomentumEnd: () => {
            // Only momentum end matters for scroll state
            isScrollingSV.value = false;
        },
    }, []);

    // ========================================================================
    // Prefetch Index Calculation
    // ========================================================================
    const getPrefetchIndices = useCallback((newIndex: number): number[] => {
        // Skip if scroll handling is disabled
        if (FEED_FLAGS.DISABLE_SCROLL_HANDLING) return [];

        const now = Date.now();
        const lastIndex = lastViewableIndexRef.current;
        const lastTs = lastViewableTsRef.current || now;
        const deltaIndex = Math.abs(newIndex - lastIndex);
        const deltaMs = Math.max(1, now - lastTs);
        const fastSwipe = deltaIndex > 1 || deltaMs < 350;
        const forward = newIndex >= lastIndex;
        const prefetchCount = fastSwipe ? 3 : 2;
        const indices = new Set<number>();
        const maxIndex = videosRef.current.length - 1;

        // Calculate prefetch indices based on scroll direction
        for (let i = 1; i <= prefetchCount; i++) {
            const idx = forward ? newIndex + i : newIndex - i;
            if (idx >= 0 && idx <= maxIndex) indices.add(idx);
        }

        // Always include immediate neighbors
        if (newIndex - 1 >= 0) indices.add(newIndex - 1);
        if (newIndex + 1 <= maxIndex) indices.add(newIndex + 1);

        return Array.from(indices);
    }, [videosRef]);

    // ========================================================================
    // Set Active Video From Index
    // ========================================================================
    const setActiveFromIndex = useCallback((newIndex: number) => {
        // Skip if scroll handling is disabled
        if (FEED_FLAGS.DISABLE_SCROLL_HANDLING) return;

        // Validate index
        if (newIndex < 0 || newIndex >= videosRef.current.length) return;

        const newVideo = videosRef.current[newIndex];
        const newId = newVideo?.id ?? null;

        // Skip if same video
        if (!newId || newId === lastActiveIdRef.current) return;

        const isActiveCarousel = newVideo?.postType === 'carousel';

        // Update tracking refs
        lastInternalIndex.current = newIndex;
        lastActiveIdRef.current = newId;
        lastViewableIndexRef.current = newIndex;
        lastViewableTsRef.current = Date.now();

        // Update store
        setActiveVideo(newId, newIndex);
        setActiveTab('foryou');
        setCleanScreen(false);
        setIsCarouselInteracting(false);

        // Cache next video
        if (!isActiveCarousel) {
            const nextVideo = videosRef.current[newIndex + 1];
            const nextUrl = isFeedVideoItem(nextVideo) ? getVideoUrl(nextVideo) : null;
            if (nextUrl) {
                VideoCacheService.cacheVideo(nextUrl).catch(() => { });
            }
        }

        // Prefetch next thumbnails for faster poster display
        [newIndex + 1, newIndex + 2].forEach((idx) => {
            const video = videosRef.current[idx];
            if (video?.thumbnailUrl) {
                Image.prefetch(video.thumbnailUrl);
            }
        });

        // Defer prefetch to avoid blocking scroll
        if (!isActiveCarousel) {
            setTimeout(() => {
                const prefetchIndices = getPrefetchIndices(newIndex).filter((idx) =>
                    isFeedVideoItem(videosRef.current[idx])
                );
                if (prefetchIndices.length === 0) return;
                FeedPrefetchService.getInstance().queueVideos(
                    videosRef.current,
                    prefetchIndices,
                    newIndex
                );
            }, 0);
        }
    }, [
        videosRef,
        setActiveVideo,
        setCleanScreen,
        setActiveTab,
        setIsCarouselInteracting,
        lastActiveIdRef,
        lastInternalIndex,
        getPrefetchIndices,
    ]);

    // ========================================================================
    // Viewable Items Changed Callback
    // ========================================================================
    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken<Video>[] }) => {
            // Skip if scroll handling is disabled
            if (FEED_FLAGS.DISABLE_SCROLL_HANDLING) return;

            if (viewableItems.length === 0) return;

            // Calculate target index based on scroll position
            const targetIndex = Math.floor(
                (scrollY.value + ITEM_HEIGHT * (1 - VIEWABILITY_THRESHOLD)) / ITEM_HEIGHT
            );

            // Find the viewable item closest to target
            let nextIndex = viewableItems[0].index ?? 0;
            let bestDistance = Math.abs(nextIndex - targetIndex);

            viewableItems.forEach((item) => {
                if (item.index == null) return;
                const distance = Math.abs(item.index - targetIndex);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    nextIndex = item.index;
                }
            });

            setActiveFromIndex(nextIndex);
        },
        [setActiveFromIndex, scrollY]
    );

    // ========================================================================
    // Viewability Config Callback Pairs (for FlashList)
    // ========================================================================
    const viewabilityConfigCallbackPairs = useRef([
        { viewabilityConfig: VIEWABILITY_CONFIG, onViewableItemsChanged },
    ]);

    // ========================================================================
    // Handle Scroll End
    // ========================================================================
    const handleScrollEnd = useCallback((
        event: any,
        videosLength: number,
        listRef: React.RefObject<any>
    ) => {
        if (videosLength === 0) return;

        const offsetY = event.nativeEvent.contentOffset.y;
        const lastVideoOffset = (videosLength - 1) * ITEM_HEIGHT;

        // Snap back if scrolled past last video
        if (offsetY > lastVideoOffset) {
            listRef.current?.scrollToIndex({ index: videosLength - 1, animated: true });
        }
    }, []);

    // ========================================================================
    // Return
    // ========================================================================
    return {
        scrollHandler,
        onViewableItemsChanged,
        setActiveFromIndex,
        getPrefetchIndices,
        handleScrollEnd,
        scrollY,
        isScrollingSV,
        viewabilityConfigCallbackPairs,
        lastViewableIndexRef,
        lastViewableTsRef,
    };
}
