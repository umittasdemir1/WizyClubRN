/**
 * usePoolFeedVideoCallbacks - Feed Video Player Callbacks Hook
 *
 * Handles all events from the video player pool:
 * - onLoad
 * - onProgress (UI sync, auto-advance)
 * - onEnd (continuous replay)
 * - onError
 *
 * @module presentation/components/feed/hooks/usePoolFeedVideoCallbacks
 */

import { useCallback, useRef, useState } from 'react';
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { FEED_CONFIG, ITEM_HEIGHT } from './usePoolFeedConfig';
import { Video } from '../../../../domain/entities/Video';

export interface UseFeedVideoCallbacksOptions {
    /** Videos array reference */
    videosRef: React.MutableRefObject<Video[]>;
    /** Current active index */
    activeIndex: number;
    /** Current active video ID */
    activeVideoId: string | null;
    /** Current viewing mode */
    viewingMode: 'off' | 'fast' | 'full';
    /** FlashList ref for mode-based auto-advance */
    listRef: React.MutableRefObject<any>;
}

export interface UseFeedVideoCallbacksReturn {
    /** Handle video loaded */
    handleVideoLoaded: (index: number) => void;
    /** Handle video error */
    handleVideoError: (index: number, error: any) => void;
    /** Handle video progress */
    handleVideoProgress: (index: number, currentTime: number, duration: number) => void;
    /** Handle video end */
    handleVideoEnd: (index: number) => void;
    /** Handle video removal from pool */
    handleRemoveVideo: (index: number) => void;
    /** SharedValue for current time (0-duration) */
    currentTimeSV: SharedValue<number>;
    /** SharedValue for video duration */
    durationSV: SharedValue<number>;
    /** Has video error state */
    hasVideoError: boolean;
    /** Set video error state */
    setHasVideoError: (value: boolean) => void;
    /** Retry count state */
    retryCount: number;
    /** Set retry count */
    setRetryCount: (value: number | ((prev: number) => number)) => void;
    /** Reset playback state for new video */
    resetPlayback: () => void;
    /** Refs for interaction sync */
    activeTimeRef: React.MutableRefObject<number>;
}

export function usePoolFeedVideoCallbacks(options: UseFeedVideoCallbacksOptions): UseFeedVideoCallbacksReturn {
    const {
        videosRef,
        activeIndex,
        activeVideoId,
        viewingMode,
        listRef,
    } = options;

    // ========================================================================
    // State & SharedValues
    // ========================================================================
    const currentTimeSV = useSharedValue(0);
    const durationSV = useSharedValue(0);
    const [hasVideoError, setHasVideoError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    // ========================================================================
    // Refs
    // ========================================================================
    const activeDurationRef = useRef(0);
    const activeTimeRef = useRef(0);
    const autoAdvanceGuardRef = useRef<string | null>(null);

    // ========================================================================
    // Handlers
    // ========================================================================

    const handleVideoLoaded = useCallback((index: number) => {
        if (index === activeIndex) {
            setHasVideoError(false);
        }
    }, [activeIndex]);

    const handleVideoError = useCallback((index: number, _error: any) => {
        if (index === activeIndex) {
            setHasVideoError(true);
            setRetryCount((prev) => prev + 1);
        }
    }, [activeIndex]);

    const handleVideoProgress = useCallback((index: number, currentTime: number, duration: number) => {
        if (index !== activeIndex) return;

        if (duration > 0) {
            durationSV.value = duration;
            activeDurationRef.current = duration;
        }

        // Update SharedValue for UI sync
        currentTimeSV.value = currentTime;
        activeTimeRef.current = currentTime;

        // Hızlı mod: uzun videolarda belirli eşikte bir sonraki videoya geç
        if (viewingMode !== 'fast') return;
        if (!activeVideoId) return;
        if (duration > 0 && duration <= FEED_CONFIG.FAST_MODE_AUTO_ADVANCE_THRESHOLD) return;
        if (currentTime < FEED_CONFIG.FAST_MODE_AUTO_ADVANCE_THRESHOLD) return;
        if (autoAdvanceGuardRef.current === activeVideoId) return;

        autoAdvanceGuardRef.current = activeVideoId;
        const nextIndex = Math.min(activeIndex + 1, videosRef.current.length - 1);
        if (nextIndex !== activeIndex) {
            listRef.current?.scrollToOffset({
                offset: nextIndex * ITEM_HEIGHT,
                animated: true,
            });
        }
    }, [activeIndex, activeVideoId, viewingMode, currentTimeSV, durationSV, videosRef, listRef]);

    const handleVideoEnd = useCallback((index: number) => {
        if (index !== activeIndex) return;
        // repeat=true ile video akışı kesintisiz döner.
        // İzleme modu açıkken eski davranış korunur: uygun modda bir sonraki videoya geç.
        const shouldAdvance =
            viewingMode === 'full' ||
            (viewingMode === 'fast' && activeDurationRef.current > 0 && activeDurationRef.current <= FEED_CONFIG.FAST_MODE_AUTO_ADVANCE_THRESHOLD);

        if (shouldAdvance) {
            const nextIndex = Math.min(activeIndex + 1, videosRef.current.length - 1);
            if (nextIndex !== activeIndex) {
                listRef.current?.scrollToOffset({
                    offset: nextIndex * ITEM_HEIGHT,
                    animated: true,
                });
            }
        }
    }, [activeIndex, listRef, videosRef, viewingMode]);

    const handleRemoveVideo = useCallback((index: number) => {
        if (index === activeIndex) {
            setHasVideoError(true);
        }
    }, [activeIndex]);

    const resetPlayback = useCallback(() => {
        setHasVideoError(false);
        setRetryCount(0);
        currentTimeSV.value = 0;
        durationSV.value = 0;
        activeDurationRef.current = 0;
        activeTimeRef.current = 0;
        autoAdvanceGuardRef.current = null;
    }, [currentTimeSV, durationSV]);

    return {
        handleVideoLoaded,
        handleVideoError,
        handleVideoProgress,
        handleVideoEnd,
        handleRemoveVideo,
        currentTimeSV,
        durationSV,
        hasVideoError,
        setHasVideoError,
        retryCount,
        setRetryCount,
        resetPlayback,
        activeTimeRef,
    };
}
