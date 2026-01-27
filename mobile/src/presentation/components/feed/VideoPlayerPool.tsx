/**
 * VideoPlayerPool - TikTok-style Video Player Recycling
 *
 * Instead of creating a new Video component for each item,
 * we maintain a pool of 3 players that get recycled as user scrolls.
 *
 * Pool slots:
 * - current (slot 0): The video currently playing
 * - next (slot 1): Preloaded, ready for instant playback
 * - previous (slot 2): Cached, ready if user scrolls back
 */

import React, { useRef, useState, useCallback, useEffect, useMemo, memo, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Image as ExpoImage, type ImageProps } from 'expo-image';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Video, { VideoRef, OnLoadData, OnProgressData, OnVideoErrorData, SelectedTrackType } from 'react-native-video';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import { VideoCacheService } from '../../../data/services/VideoCacheService';
import { getBufferConfig } from '../../../core/utils/bufferConfig';
import { getVideoUrl } from '../../../core/utils/videoUrl';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogCode, logError, logCache } from '@/core/services/Logger';
import { PerformanceLogger } from '@/core/services/PerformanceLogger';

const { height: WINDOW_HEIGHT } = Dimensions.get('window');
const MAX_RETRIES = 3;
const PosterImage = ExpoImage as unknown as React.ComponentType<ImageProps>;

const isFeedCarouselPost = (video: VideoEntity): boolean => video.postType === 'carousel';

const isPlayableFeedVideo = (video: VideoEntity): boolean => {
    return !isFeedCarouselPost(video) && Boolean(getVideoUrl(video));
};

interface PlayerSlot {
    index: number;        // Video index in the feed
    videoId: string;      // Video ID
    source: string;       // Video URL or cached path
    thumbnailUrl?: string; // ✅ Added thumbnail URL for poster
    position: number;     // Last playback position
    isLoaded: boolean;    // Whether video is ready to play
    isReadyForDisplay: boolean; // Whether video is rendered and ready to show
    resizeMode: 'cover' | 'contain';
    retryCount: number;   // Error retry count
    hasError: boolean;    // Whether slot has error
    isCarousel: boolean;  // Whether this is a carousel post (no video)
    retryNonce: number;   // Force remount for manual retry
}

interface VideoPlayerPoolProps {
    videos: VideoEntity[];
    activeIndex: number;
    isMuted: boolean;
    isPaused: boolean;
    playbackRate?: number;
    onPlaybackRateChange?: (rate: number) => void;
    onVideoLoaded: (index: number) => void;
    onVideoError: (index: number, error: any) => void;
    onProgress: (index: number, currentTime: number, duration: number) => void;
    onVideoEnd: (index: number) => void;
    onRemoveVideo?: (index: number) => void;
    onActiveReady?: (videoId: string, index: number) => void;
    scrollY: SharedValue<number>;
}

export interface VideoPlayerPoolRef {
    seekTo: (time: number) => void;
    retryActive: () => void;
    setPlaybackRate: (rate: number) => void;
}

const createEmptySlot = (index: number = -1): PlayerSlot => ({
    index,
    videoId: '',
    source: '',
    thumbnailUrl: undefined,
    position: 0,
    isLoaded: false,
    isReadyForDisplay: false,
    resizeMode: 'cover',
    retryCount: 0,
    hasError: false,
    isCarousel: false,
    retryNonce: 0,
});

// ============================================================================
// PlayerSlotRenderer - Separate component to use hooks
// ============================================================================

interface PlayerSlotRendererProps {
    slot: PlayerSlot;
    slotIndex: number;
    isActiveSlot: boolean;
    isNearActive: boolean;
    activeFeedIndex: number;
    isActiveReady: boolean;
    lastActiveSlotIndex: number;
    isOnTop: boolean;
    shouldPlay: boolean;
    isMuted: boolean;
    playbackRate: number;
    playerRef: React.RefObject<VideoRef | null>;
    scrollY: SharedValue<number>;
    insets: { top: number; bottom: number };
    netInfo: any;
    onLoad: (data: OnLoadData) => void;
    onError: (error: OnVideoErrorData) => void;
    onProgress: (data: OnProgressData) => void;
    onEnd: () => void;
    onReadyForDisplay: () => void;
}

const PlayerSlotRenderer = memo(function PlayerSlotRenderer({
    slot,
    slotIndex,
    isActiveSlot,
    isNearActive,
    activeFeedIndex,
    isActiveReady,
    lastActiveSlotIndex,
    isOnTop,
    shouldPlay,
    isMuted,
    playbackRate,
    playerRef,
    scrollY,
    insets,
    netInfo,
    onLoad,
    onError,
    onProgress,
    onEnd,
    onReadyForDisplay,
}: PlayerSlotRendererProps) {
    // ALL HOOKS MUST BE AT THE TOP - before any conditionals
    // Transform animation - uses full window height for positioning
    const animatedStyle = useAnimatedStyle(() => {
        const targetY = slot.index * WINDOW_HEIGHT;
        return {
            transform: [{ translateY: targetY - scrollY.value }]
        };
    }, [slot.index, scrollY]);

    // Check if this slot is ready to display
    const slotReady = slot.isReadyForDisplay || slot.isLoaded;

    // Show slot if:
    // 1. It's the active slot (even if not ready, so poster can render)
    // 2. It's the last active slot AND current active is not ready (seamless transition)
    // 3. It's an adjacent slot AND it's ready (for preload visibility)
    const shouldShowSlot =
        (isActiveSlot && isValidSource(slot.source)) ||
        (!isActiveSlot && !isActiveReady && lastActiveSlotIndex === slotIndex) ||
        (!isActiveSlot && isNearActive && slotReady);

    const containerVisible = shouldShowSlot ? 1 : 0;

    // Skip if carousel or no valid source
    if (slot.isCarousel) {
        return null;
    }

    // Skip rendering if no valid source
    if (!isValidSource(slot.source)) {
        return null;
    }

    const isLocal = slot.source.startsWith('file://');
    const bufferConfig = getBufferConfig(netInfo.type, isLocal);

    const sourceWithBuffer = {
        uri: slot.source,
    };

    return (
        <Animated.View
            // ✅ NO KEY - allows FlashList recycling to work properly
            style={[
                styles.playerContainer,
                animatedStyle,
                { opacity: containerVisible, zIndex: isOnTop ? 3 : 1 },
            ]}
            pointerEvents="none"
            shouldRasterizeIOS
            renderToHardwareTextureAndroid
        >
            {/* Video Player - Bottom Layer */}
            <Video
                // ✅ Key only for retry (retryNonce), not for videoId changes
                key={`video-retry-${slot.retryNonce}`}
                ref={playerRef}
                source={sourceWithBuffer}
                // @ts-ignore - bufferConfig deprecated but still works
                bufferConfig={bufferConfig}
                style={[
                    styles.video,
                    {
                        top: insets.top,
                        bottom: 0, // Tab navigator handles bottom safe area
                    }
                ]}
                // @ts-ignore - useTextureView deprecated, now default on Android
                useTextureView={Platform.OS === 'android'}
                resizeMode={slot.resizeMode}
                paused={!shouldPlay}
                muted={isMuted}
                rate={playbackRate}
                selectedAudioTrack={isMuted ? { type: SelectedTrackType.DISABLED } : undefined}
                repeat={false}
                onLoad={onLoad}
                onError={onError}
                onProgress={onProgress}
                onEnd={onEnd}
                onReadyForDisplay={onReadyForDisplay}
                // ✅ onBuffer removed for performance
                playInBackground={false}
                playWhenInactive={false}
                ignoreSilentSwitch="ignore"
                mixWithOthers={isMuted ? "mix" : undefined}
                disableFocus={isMuted}
                progressUpdateInterval={33}
                automaticallyWaitsToMinimizeStalling={false}
                shutterColor="transparent"
                // ✅ Allow background buffering optimization
                preventsDisplaySleepDuringVideoPlayback={false}
                // ✅ Force iOS to buffer ahead (5s) even when paused
                preferredForwardBufferDuration={5}
            />

            {/* ✅ Poster Image Overlay - Shows until video is ready for display */}
            {/* Prevents black screen flashes during fast scroll */}
            {!slot.isReadyForDisplay && slot.thumbnailUrl && (
                <PosterImage
                    source={{ uri: slot.thumbnailUrl }}
                    style={[
                        StyleSheet.absoluteFill,
                        {
                            zIndex: 2, // Above video
                            backgroundColor: '#000', // Fallback color
                        }
                    ]}
                    contentFit={slot.resizeMode === 'contain' ? 'contain' : 'cover'}
                    transition={0} // Instant appearance
                    cachePolicy="memory-disk"
                    priority="high"
                />
            )}
        </Animated.View>
    );
});

// Helper to validate video source
const isValidSource = (source: string | undefined | null): source is string => {
    if (!source || typeof source !== 'string') return false;
    if (source.trim() === '') return false;
    // Must be a URL or file path
    return source.startsWith('http://') ||
           source.startsWith('https://') ||
           source.startsWith('file://');
};

export const VideoPlayerPool = memo(forwardRef<VideoPlayerPoolRef, VideoPlayerPoolProps>(function VideoPlayerPool({
    videos,
    activeIndex,
    isMuted,
    isPaused,
    playbackRate = 1.0,
    onPlaybackRateChange,
    onVideoLoaded,
    onVideoError,
    onProgress,
    onVideoEnd,
    onRemoveVideo,
    onActiveReady,
    scrollY,
}, ref) {
    const netInfo = useNetInfo();
    const insets = useSafeAreaInsets();

    const playableIndexMap = useMemo(() => {
        return videos.map((video) => isPlayableFeedVideo(video));
    }, [videos]);

    const playableIndices = useMemo(() => {
        return playableIndexMap.flatMap((isPlayable, index) => (isPlayable ? [index] : []));
    }, [playableIndexMap]);

    const isPlayableIndex = useCallback((index: number | null | undefined): index is number => {
        if (index == null) return false;
        return playableIndexMap[index] === true;
    }, [playableIndexMap]);

    const activeVideoIndex = useMemo(
        () => (isPlayableIndex(activeIndex) ? activeIndex : null),
        [activeIndex, isPlayableIndex]
    );

    // 3 Player Refs
    const player1Ref = useRef<VideoRef>(null);
    const player2Ref = useRef<VideoRef>(null);
    const player3Ref = useRef<VideoRef>(null);
    const playerRefs = useMemo(() => [player1Ref, player2Ref, player3Ref], []);

    // Player slots state
    const [slots, setSlots] = useState<PlayerSlot[]>([
        createEmptySlot(0),
        createEmptySlot(1),
        createEmptySlot(-1),
    ]);
    const slotsRef = useRef(slots);
    const retryTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout> | null>>({});
    const lastActiveSlotIndexRef = useRef(0);
    const lastResetVideoIdRef = useRef<string | null>(null);
    const lastNotifiedReadyIdRef = useRef<string | null>(null);

    // Track if component is mounted
    const isMountedRef = useRef(true);

    // Track active video index to prevent race conditions
    const activeVideoIndexRef = useRef<number | null>(activeVideoIndex);
    const recycleCounterRef = useRef(0);
    const recycleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        activeVideoIndexRef.current = activeVideoIndex;
    }, [activeVideoIndex]);

    useEffect(() => {
        lastNotifiedReadyIdRef.current = null;
    }, [activeVideoIndex]);

    // Expose seek function via ref
    const seekTo = useCallback((time: number) => {
        const activeFeedIndex = activeVideoIndexRef.current;
        if (activeFeedIndex == null) return;
        const activeSlotIndex = slots.findIndex((slot) => slot.index === activeFeedIndex);
        if (activeSlotIndex < 0) return;
        playerRefs[activeSlotIndex]?.current?.seek(time);
    }, [playerRefs, slots]);

    const retryActive = useCallback(() => {
        const activeFeedIndex = activeVideoIndexRef.current;
        if (activeFeedIndex == null) return;
        const activeSlotIndex = slots.findIndex((slot) => slot.index === activeFeedIndex);
        if (activeSlotIndex < 0) return;

        setSlots((prev) => {
            const next = [...prev];
            const slot = next[activeSlotIndex];
            if (!slot) return prev;

            const video = videos[slot.index];
            const fallbackSource = video ? getVideoUrl(video) : slot.source;

            next[activeSlotIndex] = {
                ...slot,
                source: isValidSource(fallbackSource) ? fallbackSource : slot.source,
                thumbnailUrl: video?.thumbnailUrl,
                isLoaded: false,
                isReadyForDisplay: false,
                hasError: false,
                retryCount: 0,
                retryNonce: slot.retryNonce + 1,
            };
            return next;
        });
    }, [slots, videos]);

    const setPlaybackRateFromController = useCallback((rate: number) => {
        onPlaybackRateChange?.(rate);
    }, [onPlaybackRateChange]);

    const notifyActiveReady = useCallback((slotVideoId: string, feedIndex: number) => {
        if (!onActiveReady) return;
        if (activeVideoIndexRef.current == null) return;
        if (feedIndex !== activeVideoIndexRef.current) return;
        if (lastNotifiedReadyIdRef.current === slotVideoId) return;
        lastNotifiedReadyIdRef.current = slotVideoId;
        onActiveReady(slotVideoId, feedIndex);
    }, [onActiveReady]);

    useImperativeHandle(ref, () => ({
        seekTo,
        retryActive,
        setPlaybackRate: setPlaybackRateFromController,
    }), [seekTo, retryActive, setPlaybackRateFromController]);

    // Cleanup on unmount
    useEffect(() => {
        slotsRef.current = slots;
    }, [slots]);

    useEffect(() => {
        if (activeVideoIndex == null) return;
        const currentActiveSlotIndex = slots.findIndex((slot) => slot.index === activeVideoIndex);
        if (currentActiveSlotIndex < 0) return;
        const currentSlot = slots[currentActiveSlotIndex];
        if (currentSlot?.isLoaded || currentSlot?.isReadyForDisplay) {
            lastActiveSlotIndexRef.current = currentActiveSlotIndex;
        }
    }, [slots, activeVideoIndex]);

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            Object.values(retryTimeoutsRef.current).forEach((timeoutId) => {
                if (timeoutId) clearTimeout(timeoutId);
            });
            if (recycleTimeoutRef.current) {
                clearTimeout(recycleTimeoutRef.current);
                recycleTimeoutRef.current = null;
            }
        };
    }, []);

    // Always restart from the beginning when a video becomes active.
    useEffect(() => {
        if (activeVideoIndex == null) return;
        const activeVideoId = videos[activeVideoIndex]?.id ?? null;
        if (!activeVideoId) return;
        if (lastResetVideoIdRef.current === activeVideoId) return;

        const activeSlotIndex = slots.findIndex((slot) => slot.videoId === activeVideoId);
        if (activeSlotIndex < 0) return;

        playerRefs[activeSlotIndex]?.current?.seek(0);
        lastResetVideoIdRef.current = activeVideoId;
    }, [activeVideoIndex, slots, videos, playerRefs]);

    // Initialize/recycle players when activeIndex changes
    useEffect(() => {
        if (!isMountedRef.current) return;

        // Increment counter for this recycle operation
        const currentRecycleId = ++recycleCounterRef.current;
        activeVideoIndexRef.current = activeVideoIndex;

        const recycleSlots = async () => {
            // Early exit if a newer recycle has started
            if (currentRecycleId !== recycleCounterRef.current) {
                // ✅ Logging disabled for performance
                return;
            }

            const priorSlots = slotsRef.current;

            // Calculate which videos should be in each slot (video-only)
            const currentIdx = activeVideoIndex;
            const nextIdx = playableIndices.find((idx) => idx > activeIndex) ?? null;
            const prevIdx = [...playableIndices].reverse().find((idx) => idx < activeIndex) ?? null;

            // Get cached paths for each video
            const getSource = async (video: VideoEntity, preferFast: boolean): Promise<string> => {
                const videoUrl = getVideoUrl(video);
                if (!videoUrl) {
                    logError(LogCode.ERROR_VALIDATION, 'No valid videoUrl for video', { videoId: video.id });
                    return '';
                }

                // Try memory cache first (synchronous)
                const memoryCached = VideoCacheService.getMemoryCachedPath(videoUrl);
                if (memoryCached && isValidSource(memoryCached)) {
                    return memoryCached;
                }

                if (!preferFast) {
                    // Try disk cache (async)
                    const diskCached = await VideoCacheService.getCachedVideoPath(videoUrl);
                    if (diskCached && isValidSource(diskCached)) {
                        return diskCached;
                    }
                }

                // Fallback to network
                return videoUrl;
            };

            // Calculate resizeMode
            const getResizeMode = (video: VideoEntity): 'cover' | 'contain' => {
                if (video.width && video.height) {
                    return (video.width / video.height) < 0.8 ? 'cover' : 'contain';
                }
                return 'cover';
            };

            const getPreservedSlot = (videoId: string) => priorSlots.find((slot) => slot.videoId === videoId);
            const slotsEqual = (a: PlayerSlot, b: PlayerSlot) =>
                a.index === b.index &&
                a.videoId === b.videoId &&
                a.source === b.source &&
                a.thumbnailUrl === b.thumbnailUrl &&
                a.position === b.position &&
                a.isLoaded === b.isLoaded &&
                a.isReadyForDisplay === b.isReadyForDisplay &&
                a.resizeMode === b.resizeMode &&
                a.retryCount === b.retryCount &&
                a.hasError === b.hasError &&
                a.isCarousel === b.isCarousel &&
                a.retryNonce === b.retryNonce;

            const resolveActiveSlotIndex = () => {
                if (currentIdx == null) return -1;
                const existingIndex = priorSlots.findIndex((slot) => slot.index === currentIdx);
                if (existingIndex >= 0) return existingIndex;
                const emptyIndex = priorSlots.findIndex((slot) => slot.index < 0);
                if (emptyIndex >= 0) return emptyIndex;
                return 0;
            };
            const activeSlotIndex = resolveActiveSlotIndex();
            const targetIndices: Array<number | null> = [null, null, null];
            const usedIndices = new Set<number>();

            if (activeSlotIndex >= 0 && currentIdx != null) {
                targetIndices[activeSlotIndex] = currentIdx;
                usedIndices.add(currentIdx);
            }

            const remainingTargets = [nextIdx, prevIdx].filter((idx, pos, arr) =>
                idx != null && idx !== currentIdx && arr.indexOf(idx) === pos
            ) as number[];

            for (let slotIndex = 0; slotIndex < 3; slotIndex++) {
                if (slotIndex === activeSlotIndex) continue;
                const existingIdx = priorSlots[slotIndex]?.index;
                if (existingIdx != null && remainingTargets.includes(existingIdx) && !usedIndices.has(existingIdx)) {
                    targetIndices[slotIndex] = existingIdx;
                    usedIndices.add(existingIdx);
                }
            }

            for (let slotIndex = 0; slotIndex < 3; slotIndex++) {
                if (targetIndices[slotIndex] != null) continue;
                const nextTarget = remainingTargets.find((idx) => !usedIndices.has(idx));
                if (nextTarget != null) {
                    targetIndices[slotIndex] = nextTarget;
                    usedIndices.add(nextTarget);
                }
            }

            const buildSlotForIndex = async (_slotIndex: number, targetIdx: number | null): Promise<PlayerSlot | null> => {
                if (currentRecycleId !== recycleCounterRef.current) return null;
                if (targetIdx == null || !videos[targetIdx] || !isPlayableIndex(targetIdx)) {
                    return createEmptySlot(-1);
                }

                const video = videos[targetIdx];
                const source = await getSource(video, targetIdx === currentIdx);

                if (currentRecycleId !== recycleCounterRef.current) return null;

                const preserved = getPreservedSlot(video.id);
                const isSameVideo = Boolean(preserved);
                const wasReady = preserved?.isLoaded || preserved?.isReadyForDisplay;
                const preservedSource = wasReady && preserved && isValidSource(preserved.source)
                    ? preserved.source
                    : null;

                if (!isValidSource(source)) {
                    logError(LogCode.ERROR_VALIDATION, 'Invalid source for video', { videoId: video.id, source });
                }

                return {
                    index: targetIdx,
                    videoId: video.id,
                    source: preservedSource ?? (isValidSource(source) ? source : ''),
                    thumbnailUrl: video.thumbnailUrl, // ✅ Preserve thumbnail
                    position: isSameVideo ? preserved!.position : 0,
                    isLoaded: isSameVideo ? preserved!.isLoaded : false,
                    isReadyForDisplay: isSameVideo ? preserved!.isReadyForDisplay : false,
                    resizeMode: getResizeMode(video),
                    retryCount: isSameVideo ? preserved!.retryCount : 0,
                    hasError: isSameVideo ? preserved!.hasError : false,
                    isCarousel: false,
                    retryNonce: isSameVideo ? preserved!.retryNonce : 0,
                };
            };

            const applySlotUpdate = (slotIndex: number, nextSlot: PlayerSlot) => {
                const prevSlot = slotsRef.current[slotIndex];
                if (prevSlot && prevSlot.videoId && prevSlot.videoId !== nextSlot.videoId) {
                    playerRefs[slotIndex]?.current?.pause();
                }
                setSlots((prev) => {
                    const prevSlotState = prev[slotIndex];
                    if (prevSlotState && slotsEqual(prevSlotState, nextSlot)) return prev;
                    const next = [...prev];
                    next[slotIndex] = nextSlot;
                    return next;
                });
            };

            const activeSlotIndexForUpdate = currentIdx == null
                ? -1
                : targetIndices.findIndex((idx) => idx === currentIdx);
            const activeVideo = currentIdx != null ? videos[currentIdx] : null;
            const activeVideoUrl = activeVideo ? getVideoUrl(activeVideo) : null;

            if (activeSlotIndexForUpdate >= 0) {
                const nextSlot = await buildSlotForIndex(activeSlotIndexForUpdate, currentIdx);
                if (nextSlot) {
                    applySlotUpdate(activeSlotIndexForUpdate, nextSlot);

                    if (
                        activeVideoUrl &&
                        nextSlot.videoId === activeVideo?.id &&
                        nextSlot.source === activeVideoUrl &&
                        activeVideoUrl.startsWith('http')
                    ) {
                        VideoCacheService.getCachedVideoPath(activeVideoUrl)
                            .then((diskCached) => {
                                if (!diskCached || !isValidSource(diskCached)) return;
                                if (!isMountedRef.current) return;
                                if (currentRecycleId !== recycleCounterRef.current) return;
                                setSlots((prev) => {
                                    const prevSlot = prev[activeSlotIndexForUpdate];
                                    if (!prevSlot || prevSlot.videoId !== activeVideo.id) return prev;
                                    if (prevSlot.isLoaded || prevSlot.isReadyForDisplay) return prev;
                                    if (prevSlot.source === diskCached) return prev;
                                    const next = [...prev];
                                    next[activeSlotIndexForUpdate] = {
                                        ...prevSlot,
                                        source: diskCached,
                                    };
                                    return next;
                                });
                            })
                            .catch(() => {});
                    }
                }
            }

            // ✅ Update other slots in background without blocking active slot render
            const otherSlotIndices = [0, 1, 2].filter((slotIndex) => slotIndex !== activeSlotIndexForUpdate);
            Promise.all(
                otherSlotIndices.map(async (slotIndex) => ({
                    slotIndex,
                    nextSlot: await buildSlotForIndex(slotIndex, targetIndices[slotIndex]),
                }))
            ).then((results) => {
                if (!isMountedRef.current || currentRecycleId !== recycleCounterRef.current) return;
                setSlots((prev) => {
                    let next = prev;
                    results.forEach(({ slotIndex, nextSlot }) => {
                        if (!nextSlot) return;
                        const prevSlot = next[slotIndex];
                        if (prevSlot && slotsEqual(prevSlot, nextSlot)) return;
                        if (next === prev) next = [...prev];
                        next[slotIndex] = nextSlot;
                    });
                    return next;
                });
            });
        };

        if (recycleTimeoutRef.current) {
            clearTimeout(recycleTimeoutRef.current);
            recycleTimeoutRef.current = null;
        }

        if (videos.length > 0) {
            recycleTimeoutRef.current = setTimeout(() => {
                recycleSlots();
            }, 100);
        }

        return () => {
            if (recycleTimeoutRef.current) {
                clearTimeout(recycleTimeoutRef.current);
                recycleTimeoutRef.current = null;
            }
        };
    }, [activeIndex, activeVideoIndex, isPlayableIndex, playableIndices, videos]);

    // Handle video loaded
    const handleLoad = useCallback((slotIndex: number, slotVideoId: string, feedIndex: number, _data: OnLoadData) => {
        if (!isMountedRef.current) return;

        setSlots(prev => {
            const newSlots = [...prev];
            if (newSlots[slotIndex]?.videoId !== slotVideoId) return prev;
            newSlots[slotIndex] = {
                ...newSlots[slotIndex],
                isLoaded: true,
                hasError: false,
                // ✅ Reset retry count on successful load
                retryCount: 0,
            };
            return newSlots;
        });
        // ✅ Logging disabled for performance
        onVideoLoaded(feedIndex);
        notifyActiveReady(slotVideoId, feedIndex);
    }, [onVideoLoaded, notifyActiveReady]);

    // Handle video error with retry logic
    const handleError = useCallback(async (slotIndex: number, slotVideoId: string, error: OnVideoErrorData) => {
        if (!isMountedRef.current) return;

        const slot = slotsRef.current[slotIndex];
        if (!slot || slot.videoId !== slotVideoId) return;

        // ✅ Keep only critical error logs
        logError(LogCode.VIDEO_PLAYBACK_ERROR, 'Video player error', { slotIndex, retryCount: slot.retryCount, maxRetries: MAX_RETRIES, error });

        // If max retries reached, report error and stop retrying
        if (slot.retryCount >= MAX_RETRIES) {
            onRemoveVideo?.(slot.index);
            return;
        }

        // If cache file failed, try network fallback
        if (slot.source.startsWith('file://')) {
            const video = videos[slot.index];
            if (video) {
                const videoUrl = getVideoUrl(video);
                logCache(LogCode.CACHE_ERROR, 'Cache failed, falling back to network', { slotIndex, videoId: video.id });
                if (videoUrl) {
                    await VideoCacheService.deleteCachedVideo(videoUrl);
                }

                setSlots(prev => {
                    const newSlots = [...prev];
                    newSlots[slotIndex] = {
                        ...newSlots[slotIndex],
                        source: videoUrl && isValidSource(videoUrl) ? videoUrl : '',
                        thumbnailUrl: newSlots[slotIndex].thumbnailUrl,
                        retryCount: newSlots[slotIndex].retryCount + 1,
                        hasError: false,
                    };
                    return newSlots;
                });
                return;
            }
        }

        // Auto-retry: keep component mounted, remount player
        const existingTimeout = retryTimeoutsRef.current[slotIndex];
        if (existingTimeout) clearTimeout(existingTimeout);

        retryTimeoutsRef.current[slotIndex] = setTimeout(() => {
            if (!isMountedRef.current) return;
            setSlots(prev => {
                const newSlots = [...prev];
                if (newSlots[slotIndex]?.videoId !== slotVideoId) return prev;
                newSlots[slotIndex] = {
                    ...newSlots[slotIndex],
                    hasError: false,
                    isReadyForDisplay: false,
                    retryCount: newSlots[slotIndex].retryCount + 1,
                    retryNonce: newSlots[slotIndex].retryNonce + 1,
                };
                return newSlots;
            });
        }, 300);

        onVideoError(slot.index, error);
    }, [videos, onVideoError, onRemoveVideo]);

    // Handle progress
    const handleProgress = useCallback((slotIndex: number, slotVideoId: string, data: OnProgressData) => {
        if (!isMountedRef.current) return;
        const slot = slotsRef.current[slotIndex];
        if (!slot || slot.videoId !== slotVideoId) return;
        // ✅ CRITICAL FIX: Track progress for the actual active video, not just slot 0
        if (activeVideoIndex != null && slot.index === activeVideoIndex) {
            onProgress(slot.index, data.currentTime, data.seekableDuration);
        }
    }, [activeVideoIndex, onProgress]);

    // Handle video end
    const handleEnd = useCallback((slotIndex: number, slotVideoId: string, feedIndex: number) => {
        if (!isMountedRef.current) return;
        const slot = slotsRef.current[slotIndex];
        if (!slot || slot.videoId !== slotVideoId) return;
        // ✅ Logging disabled for performance
        onVideoEnd(feedIndex);
    }, [onVideoEnd]);

    // Handle video ready for display
    const handleReadyForDisplay = useCallback((slotIndex: number, slotVideoId: string) => {
        if (!isMountedRef.current) return;

        setSlots(prev => {
            const newSlots = [...prev];
            // Only mark as ready if this slot still has the same video
            if (newSlots[slotIndex]?.videoId === slotVideoId) {
                newSlots[slotIndex] = {
                    ...newSlots[slotIndex],
                    isReadyForDisplay: true,
                };
            }
            return newSlots;
        });
        const slot = slotsRef.current[slotIndex];
        if (slot && slot.videoId === slotVideoId && slot.index === activeVideoIndexRef.current) {
            PerformanceLogger.markFirstVideoReady(slotVideoId, {
                feedIndex: slot.index,
                slotIndex,
            });
        }
        if (slot && slot.videoId === slotVideoId) {
            notifyActiveReady(slotVideoId, slot.index);
        }
        // ✅ Logging disabled for performance
    }, [notifyActiveReady]);

    const activeSlotIndex = activeVideoIndex != null
        ? slots.findIndex((slot) => slot.index === activeVideoIndex)
        : -1;
    const hasActiveVideo = activeSlotIndex >= 0 && activeVideoIndex != null;
    const resolvedActiveSlotIndex = hasActiveVideo ? activeSlotIndex : -1;
    const resolvedActiveFeedIndex = hasActiveVideo ? activeVideoIndex : -1;

    // Render a single player
    const renderPlayer = (slotIndex: number, playerRef: React.RefObject<VideoRef | null>) => {
        const slot = slots[slotIndex];

        // ✅ CRITICAL FIX: Only ONE slot can be active at a time
        // Find the FIRST slot that matches active video index
        const isActiveSlot = hasActiveVideo && resolvedActiveSlotIndex === slotIndex;
        const isNearActive = hasActiveVideo && Math.abs(slot.index - resolvedActiveFeedIndex) <= 1;
        const activeSlot = hasActiveVideo ? slots[resolvedActiveSlotIndex] : undefined;
        const activeReady = activeSlot?.isLoaded || activeSlot?.isReadyForDisplay;
        const shouldPlay = isActiveSlot && !isPaused;
        const fallbackSlotIndex = hasActiveVideo ? lastActiveSlotIndexRef.current : -1;
        const isOnTop = hasActiveVideo && (activeReady
            ? isActiveSlot
            : fallbackSlotIndex === slotIndex);

        // ✅ Remove console.log for performance (blocks JS thread)

        return (
            <PlayerSlotRenderer
                key={`slot-${slotIndex}`}
                slot={slot}
                slotIndex={slotIndex}
                isActiveSlot={isActiveSlot}
                isNearActive={isNearActive}
                activeFeedIndex={resolvedActiveFeedIndex}
                isActiveReady={Boolean(activeReady)}
                lastActiveSlotIndex={fallbackSlotIndex}
                isOnTop={isOnTop}
                shouldPlay={shouldPlay}
                isMuted={isMuted}
                playbackRate={playbackRate}
                playerRef={playerRef}
                scrollY={scrollY}
                insets={insets}
                netInfo={netInfo}
                onLoad={(data) => handleLoad(slotIndex, slot.videoId, slot.index, data)}
                onError={(error) => handleError(slotIndex, slot.videoId, error)}
                onProgress={(data) => handleProgress(slotIndex, slot.videoId, data)}
                onEnd={() => handleEnd(slotIndex, slot.videoId, slot.index)}
                onReadyForDisplay={() => handleReadyForDisplay(slotIndex, slot.videoId)}
            />
        );
    };

    return (
        <View style={styles.container} pointerEvents="box-none">
            {renderPlayer(0, player1Ref)}
            {renderPlayer(1, player2Ref)}
            {renderPlayer(2, player3Ref)}
        </View>
    );
}));

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1, // Below UI layer (z-index: 50)
    },
    playerContainer: {
        position: 'absolute',
        width: '100%',
        height: WINDOW_HEIGHT,
        backgroundColor: '#000',
        zIndex: 1, // Fixed - always below UI
    },
    video: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
});
