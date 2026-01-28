/**
 * useFeedVideoCallbacks - Feed Video Player Callbacks Hook
 *
 * Handles all events from the video player pool:
 * - onLoad
 * - onProgress (UI sync, auto-advance)
 * - onEnd (looping, finish state)
 * - onError
 *
 * @module presentation/components/feed/hooks/useFeedVideoCallbacks
 */

import { useCallback, useRef, useState } from 'react';
import { SharedValue, useSharedValue } from 'react-native-reanimated';
import { FEED_CONFIG, ITEM_HEIGHT } from './useFeedConfig';
import { useActiveVideoStore } from '../../../store/useActiveVideoStore';

import { Video } from '../../../../domain/entities/Video';

export interface UseFeedVideoCallbacksOptions {
    /** Videos array reference */
    videosRef: React.MutableRefObject<Video[]>;
    /** Current active index */
    activeIndex: number;
    /** Current active video ID */
    activeVideoId: string | null;
    /** Current viewing mode ('full', 'fast', 'minimal') */
    viewingMode: string;
    /** Toggle pause function from store */
    togglePause: () => void;
    /** Set clean screen function */
    setCleanScreen: (value: boolean) => void;
    /** Video player pool ref for retry/seek */
    videoPlayerRef: React.MutableRefObject<any>;
    /** FlashList ref for auto-advance */
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
    /** Is video finished state */
    isVideoFinished: boolean;
    /** Set video finished state */
    setIsVideoFinished: (value: boolean) => void;
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
    loopCountRef: React.MutableRefObject<number>;
    lastLoopTimeRef: React.MutableRefObject<number>;
    activeTimeRef: React.MutableRefObject<number>;
}

export function useFeedVideoCallbacks(options: UseFeedVideoCallbacksOptions): UseFeedVideoCallbacksReturn {
    const {
        videosRef,
        activeIndex,
        activeVideoId,
        viewingMode,
        togglePause,
        setCleanScreen,
        videoPlayerRef,
        listRef,
    } = options;

    // ========================================================================
    // State & SharedValues
    // ========================================================================
    const currentTimeSV = useSharedValue(0);
    const durationSV = useSharedValue(0);
    const [isVideoFinished, setIsVideoFinished] = useState(false);
    const [hasVideoError, setHasVideoError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    // ========================================================================
    // Refs
    // ========================================================================
    const activeDurationRef = useRef(0);
    const activeTimeRef = useRef(0);
    const loopCountRef = useRef(0);
    const lastLoopTimeRef = useRef(Date.now());
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

        // Auto-advance logic for 'fast' mode
        if (viewingMode !== 'fast') return;
        if (!activeVideoId) return;
        if (duration > 0 && duration <= 10) return;
        if (currentTime < 10) return;
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

        const now = Date.now();
        if (now - lastLoopTimeRef.current < FEED_CONFIG.LOOP_DEBOUNCE_MS) {
            return;
        }
        lastLoopTimeRef.current = now;

        loopCountRef.current += 1;

        if (loopCountRef.current < FEED_CONFIG.MAX_VIDEO_LOOPS) {
            videoPlayerRef.current?.seekTo(0);
            const isPausedNow = useActiveVideoStore.getState().isPaused;
            if (isPausedNow) {
                togglePause();
            }
            return;
        }

        // Finish state
        setIsVideoFinished(true);
        setCleanScreen(false);

        // Auto-advance logic for 'full' and 'fast' (short videos)
        const shouldAdvance =
            viewingMode === 'full' ||
            (viewingMode === 'fast' && activeDurationRef.current > 0 && activeDurationRef.current <= 10);

        if (shouldAdvance) {
            const nextIndex = Math.min(activeIndex + 1, videosRef.current.length - 1);
            if (nextIndex !== activeIndex) {
                listRef.current?.scrollToOffset({
                    offset: nextIndex * ITEM_HEIGHT,
                    animated: true,
                });
            }
        }
    }, [activeIndex, viewingMode, videoPlayerRef, listRef, videosRef, togglePause, setCleanScreen]);

    const handleRemoveVideo = useCallback((index: number) => {
        if (index === activeIndex) {
            setHasVideoError(true);
        }
    }, [activeIndex]);

    const resetPlayback = useCallback(() => {
        setHasVideoError(false);
        setIsVideoFinished(false);
        setRetryCount(0);
        currentTimeSV.value = 0;
        durationSV.value = 0;
        activeTimeRef.current = 0;
        activeDurationRef.current = 0;
        loopCountRef.current = 0;
        lastLoopTimeRef.current = Date.now();
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
        isVideoFinished,
        setIsVideoFinished,
        hasVideoError,
        setHasVideoError,
        retryCount,
        setRetryCount,
        resetPlayback,
        loopCountRef,
        lastLoopTimeRef,
        activeTimeRef,
    };
}
