/**
 * useFeedInteractions - Feed Gesture & Interaction Hook
 *
 * Handles all gesture and interaction logic for the feed:
 * - Single tap (play/pause toggle)
 * - Double tap (like animation)
 * - Long press (speed boost / options sheet)
 * - Carousel touch handling
 *
 * @module presentation/components/feed/hooks/useFeedInteractions
 */

import { useCallback, useRef, useState, useMemo } from 'react';
import { SCREEN_WIDTH, isDisabled } from './useFeedConfig';
import { Video } from '../../../../domain/entities/Video';
import { useActiveVideoStore } from '../../../store/useActiveVideoStore';
import { LogCode, logUI } from '../../../../core/services/Logger';

// ============================================================================
// Types
// ============================================================================

export interface UseFeedInteractionsOptions {
    /** Videos array reference */
    videosRef: React.MutableRefObject<Video[]>;
    /** Toggle like function from parent */
    toggleLike: (videoId: string) => void;
    /** Toggle pause function from store */
    togglePause: () => void;
    /** Active tab state */
    activeTab: 'stories' | 'foryou';
    /** Set active tab */
    setActiveTab: (tab: 'stories' | 'foryou') => void;
    /** Is video finished state */
    isVideoFinished: boolean;
    /** Set video finished state */
    setIsVideoFinished: (value: boolean) => void;
    /** Set carousel interacting state */
    setIsCarouselInteracting: (value: boolean) => void;
    /** Current playback rate */
    playbackRate: number;
    /** Set rate label for display */
    setRateLabel: (label: string | null) => void;
    /** Video player ref for seeking */
    videoPlayerRef: React.MutableRefObject<any>;
    /** More options sheet ref */
    moreOptionsSheetRef: React.MutableRefObject<any>;
    /** Loop count ref */
    loopCountRef: React.MutableRefObject<number>;
    /** Last loop time ref */
    lastLoopTimeRef: React.MutableRefObject<number>;
}

export interface UseFeedInteractionsReturn {
    /** Handle single tap on feed */
    handleFeedTap: () => void;
    /** Handle double tap for like */
    handleDoubleTapLike: (videoId: string) => void;
    /** Handle press in (track position) */
    handlePressIn: (event: any) => void;
    /** Handle long press (speed boost or options) */
    handleLongPress: (event: any) => void;
    /** Handle press out (reset speed) */
    handlePressOut: () => void;
    /** Handle carousel touch start */
    handleCarouselTouchStart: () => void;
    /** Handle carousel touch end */
    handleCarouselTouchEnd: () => void;
    /** Handle action button press in */
    handleActionPressIn: () => void;
    /** Handle action button press out */
    handleActionPressOut: () => void;
    /** Show tap indicator */
    showTapIndicator: (type: 'play' | 'pause') => void;
    /** Tap indicator state */
    tapIndicator: null | 'play' | 'pause';
    /** Set playback rate via controller */
    setPlaybackRateViaController: (rate: number) => void;
    /** Action buttons pressing ref */
    actionButtonsPressingRef: React.MutableRefObject<boolean>;
    /** Double tap block until ref */
    doubleTapBlockUntilRef: React.MutableRefObject<number>;
    /** Last scroll end ref */
    lastScrollEndRef: React.MutableRefObject<number>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook for managing feed gesture interactions.
 *
 * @param options - Configuration options for the hook
 * @returns Gesture handlers and related state
 */
export function useFeedInteractions(options: UseFeedInteractionsOptions): UseFeedInteractionsReturn {
    const {
        videosRef,
        toggleLike,
        togglePause,
        activeTab,
        setActiveTab,
        isVideoFinished,
        setIsVideoFinished,
        setIsCarouselInteracting,
        playbackRate,
        setRateLabel,
        videoPlayerRef,
        moreOptionsSheetRef,
        loopCountRef,
        lastLoopTimeRef,
    } = options;

    // ========================================================================
    // Refs for stable callbacks
    // ========================================================================
    const isVideoFinishedRef = useRef(isVideoFinished);
    isVideoFinishedRef.current = isVideoFinished;

    const activeTabRef = useRef(activeTab);
    activeTabRef.current = activeTab;

    const actionButtonsPressingRef = useRef(false);
    const doubleTapBlockUntilRef = useRef(0);
    const lastScrollEndRef = useRef(0);
    const lastPressXRef = useRef<number | null>(null);
    const wasSpeedBoostedRef = useRef(false);
    const previousPlaybackRateRef = useRef(playbackRate);

    // ========================================================================
    // Local State
    // ========================================================================
    const [tapIndicator, setTapIndicator] = useState<null | 'play' | 'pause'>(null);
    const tapIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ========================================================================
    // Show Tap Indicator
    // ========================================================================
    const showTapIndicator = useCallback((type: 'play' | 'pause') => {
        if (isDisabled('DISABLE_INTERACTIONS')) return;

        setTapIndicator(type);
        if (tapIndicatorTimeoutRef.current) {
            clearTimeout(tapIndicatorTimeoutRef.current);
        }
        tapIndicatorTimeoutRef.current = setTimeout(() => {
            setTapIndicator(null);
        }, 500);
    }, []);

    // ========================================================================
    // Set Playback Rate Via Controller
    // ========================================================================
    const setPlaybackRateViaController = useCallback((rate: number) => {
        if (videoPlayerRef.current?.setPlaybackRate) {
            videoPlayerRef.current.setPlaybackRate(rate);
            return;
        }
        useActiveVideoStore.getState().setPlaybackRate(rate);
    }, [videoPlayerRef]);

    // ========================================================================
    // Handle Single Tap (Play/Pause Toggle)
    // ========================================================================
    const handleFeedTap = useCallback(() => {
        if (isDisabled('DISABLE_INTERACTIONS')) return;

        // Block taps during action button presses
        if (actionButtonsPressingRef.current) return;

        // Block taps right after double-tap
        if (Date.now() < doubleTapBlockUntilRef.current) return;

        // Handle restart when video is finished
        if (isVideoFinishedRef.current) {
            if (__DEV__) {
                logUI(LogCode.INTERACTION_TAP, 'Manual restart triggered');
            }
            setIsVideoFinished(false);
            loopCountRef.current = 0;
            lastLoopTimeRef.current = Date.now();
            videoPlayerRef.current?.seekTo(0);
            const isPausedNow = useActiveVideoStore.getState().isPaused;
            if (isPausedNow) {
                togglePause();
            }
            return;
        }

        // Handle story tab tap
        if (activeTabRef.current === 'stories') {
            setActiveTab('foryou');
            setTimeout(() => {
                if (useActiveVideoStore.getState().isPaused) togglePause();
            }, 300);
        } else {
            // Normal play/pause toggle
            const wasPaused = useActiveVideoStore.getState().isPaused;
            togglePause();
            showTapIndicator(wasPaused ? 'play' : 'pause');
        }
    }, [
        togglePause,
        showTapIndicator,
        setActiveTab,
        setIsVideoFinished,
        videoPlayerRef,
        loopCountRef,
        lastLoopTimeRef,
    ]);

    // ========================================================================
    // Handle Double Tap Like
    // ========================================================================
    const handleDoubleTapLike = useCallback((videoId: string) => {
        if (isDisabled('DISABLE_INTERACTIONS')) return;

        // Block if scrolling just ended
        if (Date.now() - lastScrollEndRef.current < 150) return;

        const targetVideo = videosRef.current.find((video) => video.id === videoId);
        if (!targetVideo) return;

        // Set block for single tap
        doubleTapBlockUntilRef.current = Date.now() + 350;

        // Only like if not already liked
        if (!targetVideo.isLiked) {
            toggleLike(videoId);
        }
    }, [toggleLike, videosRef]);

    // ========================================================================
    // Handle Press In (Track Position)
    // ========================================================================
    const handlePressIn = useCallback((event: any) => {
        if (isDisabled('DISABLE_INTERACTIONS')) return;
        lastPressXRef.current = event?.nativeEvent?.pageX ?? event?.nativeEvent?.locationX ?? null;
    }, []);

    // ========================================================================
    // Handle Long Press (Speed Boost or Options)
    // ========================================================================
    // Keep latest playbackRate in ref for stable callbacks
    const currentPlaybackRateRef = useRef(playbackRate);
    currentPlaybackRateRef.current = playbackRate;

    const handleLongPress = useCallback((event: any) => {
        if (isDisabled('DISABLE_INTERACTIONS') || isDisabled('DISABLE_OVERLAYS')) return;

        const pressX = lastPressXRef.current ?? event?.nativeEvent?.pageX ?? event?.nativeEvent?.locationX ?? 0;
        const isRightSide = pressX > SCREEN_WIDTH * 0.8;

        if (isRightSide) {
            // Speed boost on right side
            wasSpeedBoostedRef.current = true;
            previousPlaybackRateRef.current = currentPlaybackRateRef.current;
            setPlaybackRateViaController(2.0);
            setRateLabel('2x');
            return;
        }

        // Reset speed if was boosted
        if (wasSpeedBoostedRef.current) {
            wasSpeedBoostedRef.current = false;
            setPlaybackRateViaController(previousPlaybackRateRef.current);
            setRateLabel(null);
        }

        // Open options sheet
        moreOptionsSheetRef.current?.snapToIndex(0);
        lastPressXRef.current = null;
    }, [setPlaybackRateViaController, setRateLabel, moreOptionsSheetRef]);

    // ========================================================================
    // Handle Press Out (Reset Speed)
    // ========================================================================
    const handlePressOut = useCallback(() => {
        if (isDisabled('DISABLE_INTERACTIONS')) return;

        if (!wasSpeedBoostedRef.current) return;

        wasSpeedBoostedRef.current = false;
        setPlaybackRateViaController(previousPlaybackRateRef.current);
        setRateLabel(null);
        lastPressXRef.current = null;
    }, [setPlaybackRateViaController, setRateLabel]);

    // ========================================================================
    // Handle Carousel Touch
    // ========================================================================
    const handleCarouselTouchStart = useCallback(() => {
        if (isDisabled('DISABLE_INTERACTIONS')) return;
        setIsCarouselInteracting(true);
    }, [setIsCarouselInteracting]);

    const handleCarouselTouchEnd = useCallback(() => {
        if (isDisabled('DISABLE_INTERACTIONS')) return;
        setIsCarouselInteracting(false);
    }, [setIsCarouselInteracting]);

    // ========================================================================
    // Handle Action Button Press
    // ========================================================================
    const handleActionPressIn = useCallback(() => {
        actionButtonsPressingRef.current = true;
    }, []);

    const handleActionPressOut = useCallback(() => {
        actionButtonsPressingRef.current = false;
    }, []);

    // ========================================================================
    // Return
    // ========================================================================
    return useMemo(() => ({
        handleFeedTap,
        handleDoubleTapLike,
        handlePressIn,
        handleLongPress,
        handlePressOut,
        handleCarouselTouchStart,
        handleCarouselTouchEnd,
        handleActionPressIn,
        handleActionPressOut,
        showTapIndicator,
        tapIndicator,
        setPlaybackRateViaController,
        actionButtonsPressingRef,
        doubleTapBlockUntilRef,
        lastScrollEndRef,
    }), [
        handleFeedTap,
        handleDoubleTapLike,
        handlePressIn,
        handleLongPress,
        handlePressOut,
        handleCarouselTouchStart,
        handleCarouselTouchEnd,
        handleActionPressIn,
        handleActionPressOut,
        showTapIndicator,
        tapIndicator,
        setPlaybackRateViaController,
    ]);
}
