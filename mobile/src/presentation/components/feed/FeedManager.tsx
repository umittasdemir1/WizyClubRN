/**
 * FeedManager - Dual Layer Architecture
 *
 * This component implements a decoupled video/UI architecture for optimal performance:
 *
 * Layer 1: VideoPlayerPool (z-index: 1)
 *   - 3 pre-created video players that recycle
 *   - Zero player creation during scroll
 *   - Native thread video decoding
 *
 * Layer 2: FlashList (z-index: 5)
 *   - Transparent scroll detection only
 *   - Viewability tracking for active video
 *   - No video players, no heavy UI
 *
 * Layer 3: ActiveVideoOverlay (z-index: 50)
 *   - All UI for active video only
 *   - Completely decoupled from video layer
 *   - 0ms sync via SharedValues
 *
 * Layer 4: Global Overlays (z-index: 100+)
 *   - HeaderOverlay, StoryBar, Sheets, Modals
 */

import { FlashList } from '@shopify/flash-list';
import type { ViewToken } from 'react-native';
import {
    Dimensions,
    StyleSheet,
    View,
    ActivityIndicator,
    Text,
    RefreshControl,
    ScrollView,
    Pressable,
    Share,
    Alert,
    Animated as RNAnimated,
    Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import { HeaderOverlay } from './HeaderOverlay';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { DescriptionSheet } from '../sheets/DescriptionSheet';
import { MoreOptionsSheet } from '../sheets/MoreOptionsSheet';
import {
    useActiveVideoStore,
    useAppStateSync,
    useMuteControls,
} from '../../store/useActiveVideoStore';
import { Video } from '../../../domain/entities/Video';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, useAnimatedScrollHandler } from 'react-native-reanimated';
import BottomSheet from '@gorhom/bottom-sheet';
import { useRouter, useFocusEffect } from 'expo-router';
import { FeedSkeleton } from './FeedSkeleton';
import { useUploadStore } from '../../store/useUploadStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useStartupStore } from '../../store/useStartupStore';
import { SwipeWrapper } from '../shared/SwipeWrapper';
import { StoryBar } from './StoryBar';
import { useInAppBrowserStore } from '../../store/useInAppBrowserStore';
import { useStoryViewer } from '../../hooks/useStoryViewer';
import { COLORS } from '../../../core/constants';
import React from 'react';
import { SystemBars } from 'react-native-edge-to-edge';
import { Bookmark } from 'lucide-react-native';
import { FeedPrefetchService } from '../../../data/services/FeedPrefetchService';
import { VideoCacheService } from '../../../data/services/VideoCacheService';
import { LogCode, logUI, logError } from '@/core/services/Logger';
import { Image } from 'expo-image';
import { getVideoUrl } from '../../../core/utils/videoUrl';

// New architecture imports
import { VideoPlayerPool, type VideoPlayerPoolRef } from './VideoPlayerPool';
import { BrightnessOverlay } from './BrightnessOverlay';
import { ActiveVideoOverlay } from './ActiveVideoOverlay';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

// Import modular hooks
import {
    SCREEN_WIDTH,
    ITEM_HEIGHT,
    FEED_FLAGS,
    FEED_COLORS,
    VIEWABILITY_CONFIG,
    VIEWABILITY_THRESHOLD,
} from './hooks/useFeedConfig';

// Legacy flag aliases (for backward compatibility during refactoring)
const DISABLE_FEED_UI_FOR_TEST = FEED_FLAGS.DISABLE_FEED_UI_FOR_TEST;
const DISABLE_ACTIVE_VIDEO_OVERLAY = FEED_FLAGS.DISABLE_ACTIVE_VIDEO_OVERLAY;
const DISABLE_GLOBAL_OVERLAYS = FEED_FLAGS.DISABLE_GLOBAL_OVERLAYS;
const DISABLE_NON_ACTIVE_UI = FEED_FLAGS.DISABLE_NON_ACTIVE_UI;
const SAVE_ICON_ACTIVE = FEED_COLORS.SAVE_ICON_ACTIVE;

const isFeedVideoItem = (video?: Video | null): boolean => {
    if (!video) return false;
    if (video.postType === 'carousel') return false;
    return Boolean(getVideoUrl(video));
};

// ============================================================================ 
// Types
// ============================================================================ 

interface FeedManagerProps {
    videos: Video[];
    isLoading: boolean;
    isRefreshing: boolean;
    isLoadingMore?: boolean;
    hasMore?: boolean;
    error: string | null;
    refreshFeed: () => void;
    loadMore?: () => void;
    toggleLike: (id: string) => void;
    toggleSave: (id: string) => void;
    toggleFollow: (id: string) => void;
    toggleShare: (id: string) => void;
    toggleShop: (id: string) => void;
    deleteVideo: (id: string) => void;
    prependVideo?: (video: Video) => void;
    showStories?: boolean;
    isCustomFeed?: boolean;
}

// Import extracted component
import { ScrollPlaceholder } from './ScrollPlaceholder';

// ============================================================================ 
// Main Component
// ============================================================================ 

export const FeedManager = ({
    videos,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    error,
    refreshFeed,
    loadMore,
    toggleLike,
    toggleSave,
    toggleFollow,
    toggleShare,
    toggleShop: _toggleShop,
    deleteVideo,
    prependVideo,
    showStories = true,
    isCustomFeed = false,
}: FeedManagerProps) => {
    // ======================================================================== 
    // Store subscriptions
    // ======================================================================== 
    const setActiveVideo = useActiveVideoStore((state) => state.setActiveVideo);
    const activeVideoId = useActiveVideoStore((state) => state.activeVideoId);
    const activeIndex = useActiveVideoStore((state) => state.activeIndex);
    const isSeeking = useActiveVideoStore((state) => state.isSeeking);
    const isPaused = useActiveVideoStore((state) => state.isPaused);
    const isAppActive = useActiveVideoStore((state) => state.isAppActive);
    const ignoreAppState = useActiveVideoStore((state) => state.ignoreAppState);
    const togglePause = useActiveVideoStore((state) => state.togglePause);
    const setPaused = useActiveVideoStore((state) => state.setPaused);
    const setScreenFocused = useActiveVideoStore((state) => state.setScreenFocused);
    const isCleanScreen = useActiveVideoStore((state) => state.isCleanScreen);
    const setCleanScreen = useActiveVideoStore((state) => state.setCleanScreen);
    const playbackRate = useActiveVideoStore((state) => state.playbackRate);
    const viewingMode = useActiveVideoStore((state) => state.viewingMode);
    const setPlaybackRate = useActiveVideoStore((state) => state.setPlaybackRate);

    // ======================================================================== 
    // SharedValues for video/UI sync (0ms latency)
    // ======================================================================== 
    const currentTimeSV = useSharedValue(0);
    const durationSV = useSharedValue(0);
    const isScrollingSV = useSharedValue(false);
    const scrollY = useSharedValue(0);

    // ======================================================================== 
    // Local state
    // ======================================================================== 
    const [tapIndicator, setTapIndicator] = useState<null | 'play' | 'pause'>(null);
    const [activeTab, setActiveTab] = useState<'stories' | 'foryou'>('foryou');
    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
    const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);
    const [saveToastActive, setSaveToastActive] = useState(false);
    const [isCarouselInteracting, _setIsCarouselInteracting] = useState(false);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event: any) => {
            // ✅ FIX #4: Only update scrollY (critical for video positioning)
            // All other state updates moved to JS callbacks to reduce worklet load
            scrollY.value = event.contentOffset.y;
        },
        onBeginDrag: () => {
            isScrollingSV.value = true;
        },
        onMomentumEnd: () => {
            // ✅ Simplified: Only momentum end matters for scroll state
            isScrollingSV.value = false;
        },
    }, []);

    // Video playback state (from pool callbacks)
    const [hasVideoError, setHasVideoError] = useState(false);
    const [isVideoFinished, setIsVideoFinished] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [rateLabel, setRateLabel] = useState<string | null>(null);

    // ======================================================================== 
    // Refs
    // ======================================================================== 
    const listRef = useRef<any>(null);
    const descriptionSheetRef = useRef<BottomSheet>(null);
    const moreOptionsSheetRef = useRef<BottomSheet>(null);
    const tapIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const videosRef = useRef(videos);
    const wasPlayingBeforeWebViewRef = useRef(false);
    const wasPlayingBeforeShareRef = useRef(false);
    const wasPlayingBeforeBackgroundRef = useRef(false);
    const activeDurationRef = useRef(0);
    const activeTimeRef = useRef(0);
    const actionButtonsPressingRef = useRef(false);
    const doubleTapBlockUntilRef = useRef(0);
    const lastActiveIdRef = useRef<string | null>(activeVideoId);
    const lastInternalIndex = useRef(activeIndex);
    const lastViewableIndexRef = useRef(0);
    const lastViewableTsRef = useRef(0);
    const autoAdvanceGuardRef = useRef<string | null>(null);
    const wasSpeedBoostedRef = useRef(false);
    const previousPlaybackRateRef = useRef(playbackRate);
    const lastPressXRef = useRef<number | null>(null);
    const videoPlayerRef = useRef<VideoPlayerPoolRef | null>(null);
    const lastScrollEndRef = useRef(0);
    const loopCountRef = useRef(0);
    const lastLoopTimeRef = useRef(Date.now());
    const wasPlayingBeforeBlurRef = useRef(false);

    // Toast animation
    const saveToastTranslateY = useRef(new RNAnimated.Value(-70)).current;
    const saveToastOpacity = useRef(new RNAnimated.Value(0)).current;
    const saveToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ======================================================================== 
    // Hooks
    // ======================================================================== 
    const insets = useSafeAreaInsets();
    const netInfo = useNetInfo();
    const router = useRouter();
    const { isMuted, toggleMute } = useMuteControls();
    const { user } = useAuthStore();
    const { stories: storyListData } = useStoryViewer();
    const isInAppBrowserVisible = useInAppBrowserStore((state) => state.isVisible);
    const openInAppBrowser = useInAppBrowserStore((state) => state.openUrl);
    const uploadStatus = useUploadStore((state) => state.status);
    const uploadedVideoId = useUploadStore((state) => state.uploadedVideoId);
    const resetUpload = useUploadStore((state) => state.reset);
    const markStartupComplete = useStartupStore((state) => state.markStartupComplete);

    useAppStateSync();

    useEffect(() => {
        FeedPrefetchService.getInstance().setNetworkType(netInfo.type);
    }, [netInfo.type]);

    useEffect(() => {
        if (__DEV__) {
            logUI(LogCode.DEBUG_INFO, 'FeedManager isPaused state', { isPaused, activeIndex, activeVideoId });
        }
    }, [isPaused, activeIndex, activeVideoId]);

    // ======================================================================== 
    // Derived state
    // ======================================================================== 
    const currentUserId = user?.id;
    const activeVideo = useMemo(
        () => videos.find((v) => v.id === activeVideoId) || null,
        [videos, activeVideoId]
    );
    const isOwnActiveVideo = !!activeVideo && activeVideo.user?.id === currentUserId;
    const isActivePlayable = useMemo(
        () => (activeVideo ? isFeedVideoItem(activeVideo) : false),
        [activeVideo]
    );
    const activeProfileRoute = useMemo(() => {
        if (!activeVideo?.user?.id) return null;
        return isOwnActiveVideo ? '/profile' : `/user/${activeVideo.user.id}`;
    }, [activeVideo?.user?.id, isOwnActiveVideo]);

    const storyUsers = useMemo(() => {
        return storyListData.reduce((acc: any[], story) => {
            const existing = acc.find((u) => u.id === story.user.id);
            if (!existing) {
                acc.push({
                    id: story.user.id,
                    username: story.user.username,
                    avatarUrl: story.user.avatarUrl,
                    hasUnseenStory: !story.isViewed,
                });
            } else if (!story.isViewed) {
                existing.hasUnseenStory = true;
            }
            return acc;
        }, []);
    }, [storyListData]);

    const hasUnseenStories = storyUsers.some((u: any) => u.hasUnseenStory);

    const handleSwipeLeft = useCallback(() => {
        if (isCustomFeed || !activeProfileRoute) return;
        router.push(activeProfileRoute as any);
    }, [activeProfileRoute, isCustomFeed, router]);

    // ======================================================================== 
    // Effects
    // ======================================================================== 

    // Keep videosRef in sync
    useEffect(() => {
        videosRef.current = videos;
    }, [videos]);

    // Handle upload success
    useEffect(() => {
        if (uploadedVideoId && uploadStatus === 'success' && prependVideo && !isCustomFeed) {
            const handleUploadSuccess = async () => {
                const { supabase } = require('../../../core/supabase');
                const { data: videoData } = await supabase
                    .from('videos')
                    .select('*, profiles:user_id(*)')
                    .eq('id', uploadedVideoId)
                    .single();

                if (videoData) {
                    const newVideo: Video = {
                        id: videoData.id,
                        videoUrl: videoData.video_url,
                        thumbnailUrl: videoData.thumbnail_url,
                        description: videoData.description || '',
                        user: {
                            id: videoData.profiles?.id || videoData.user_id,
                            username: videoData.profiles?.username || 'unknown',
                            fullName: videoData.profiles?.full_name || '',
                            avatarUrl: videoData.profiles?.avatar_url || '',
                            isFollowing: false,
                        },
                        likesCount: 0,
                        savesCount: 0,
                        sharesCount: 0,
                        shopsCount: 0,
                        commentsCount: 0,
                        isLiked: false,
                        isSaved: false,
                        isCommercial: videoData.is_commercial || false,
                        commercialType: videoData.commercial_type || null,
                        brandName: videoData.brand_name || null,
                        brandUrl: videoData.brand_url || null,
                        createdAt: videoData.created_at,
                        mediaUrls: videoData.media_urls,
                        postType: videoData.post_type,
                    };
                    prependVideo(newVideo);
                    setTimeout(() => {
                        listRef.current?.scrollToIndex({ index: 0, animated: false });
                        setActiveVideo(uploadedVideoId, 0);
                    }, 100);
                    resetUpload();
                }
            };
            handleUploadSuccess();
        }
    }, [uploadedVideoId, uploadStatus, prependVideo, isCustomFeed, setActiveVideo, resetUpload]);

    // Handle in-app browser pause/resume
    useEffect(() => {
        if (isInAppBrowserVisible) {
            const currentIsPaused = useActiveVideoStore.getState().isPaused;
            wasPlayingBeforeWebViewRef.current = !currentIsPaused;
            if (!currentIsPaused) {
                togglePause();
            }
            return;
        }

        if (wasPlayingBeforeWebViewRef.current) {
            const currentIsPaused = useActiveVideoStore.getState().isPaused;
            if (currentIsPaused) {
                togglePause();
            }
            wasPlayingBeforeWebViewRef.current = false;
        }
    }, [isInAppBrowserVisible, togglePause]);

    // Pause/resume on app background/foreground
    useEffect(() => {
        if (ignoreAppState || isInAppBrowserVisible) return;

        if (!isAppActive) {
            const currentIsPaused = useActiveVideoStore.getState().isPaused;
            wasPlayingBeforeBackgroundRef.current = !currentIsPaused;
            if (!currentIsPaused) {
                setPaused(true);
            }
            return;
        }

        if (wasPlayingBeforeBackgroundRef.current) {
            const currentIsPaused = useActiveVideoStore.getState().isPaused;
            if (currentIsPaused) {
                setPaused(false);
            }
            wasPlayingBeforeBackgroundRef.current = false;
        }
    }, [ignoreAppState, isAppActive, isInAppBrowserVisible, setPaused]);

    // Cleanup timeouts
    useEffect(() => {
        return () => {
            if (saveToastTimeoutRef.current) clearTimeout(saveToastTimeoutRef.current);
            if (tapIndicatorTimeoutRef.current) clearTimeout(tapIndicatorTimeoutRef.current);
        };
    }, []);

    // Status bar style
    useFocusEffect(
        useCallback(() => {
            SystemBars.setStyle({ statusBar: 'light', navigationBar: 'light' });
        }, [])
    );

    // Screen focus handling
    useFocusEffect(
        useCallback(() => {
            setScreenFocused(true);
            setActiveTab('foryou');
            if (wasPlayingBeforeBlurRef.current) {
                const currentIsPaused = useActiveVideoStore.getState().isPaused;
                if (currentIsPaused) {
                    setPaused(false);
                }
                wasPlayingBeforeBlurRef.current = false;
            }

            return () => {
                const currentIsPaused = useActiveVideoStore.getState().isPaused;
                wasPlayingBeforeBlurRef.current = !currentIsPaused;
                if (!currentIsPaused) {
                    setPaused(true);
                }
                setScreenFocused(false);
            };
        }, [setScreenFocused, setPaused])
    );

    // Fast init - set first video as active
    useEffect(() => {
        if (videos.length > 0 && !activeVideoId) {
            setActiveVideo(videos[0].id, 0);
            lastActiveIdRef.current = videos[0].id;
        }
    }, [videos, activeVideoId, setActiveVideo]);

    // Sync internal index with store
    useEffect(() => {
        if (videos.length > 0 && activeIndex !== lastInternalIndex.current) {
            listRef.current?.scrollToIndex({ index: activeIndex, animated: false });
            lastInternalIndex.current = activeIndex;
        }
    }, [activeIndex, videos.length]);

    // Track activeVideoId changes
    useEffect(() => {
        lastActiveIdRef.current = activeVideoId;
        // Reset video state when video changes
        setHasVideoError(false);
        setIsVideoFinished(false);
        setRetryCount(0);
        currentTimeSV.value = 0;
        durationSV.value = 0;
        activeTimeRef.current = 0;
        activeDurationRef.current = 0;
        loopCountRef.current = 0;
        lastLoopTimeRef.current = Date.now();
    }, [activeVideoId, currentTimeSV, durationSV]);

    // Playback rate sync
    useEffect(() => {
        if (!wasSpeedBoostedRef.current) {
            previousPlaybackRateRef.current = playbackRate;
        }
    }, [playbackRate]);

    // Reset auto-advance guard
    useEffect(() => {
        autoAdvanceGuardRef.current = null;
    }, [activeVideoId, viewingMode]);

    // ======================================================================== 
    // Callbacks - VideoPlayerPool
    // ======================================================================== 

    const handleVideoLoaded = useCallback((index: number) => {
        // Video loaded successfully - clear any loading/error states
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

        if (isSeeking) {
            return;
        }

        // Update SharedValues for UI sync
        currentTimeSV.value = currentTime;
        activeTimeRef.current = currentTime;

        // Fast viewing mode auto-advance
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
    }, [activeIndex, activeVideoId, viewingMode, currentTimeSV, durationSV, isSeeking]);

    const handleVideoEnd = useCallback((index: number) => {
        if (index !== activeIndex) return;

        // Debounce: prevent double-counting (e.g., from seek or rapid callbacks)
        const now = Date.now();
        if (now - lastLoopTimeRef.current < 1000) {
            if (__DEV__) {
                logUI(LogCode.DEBUG_INFO, 'Video end ignored (debounce)');
            }
            return;
        }
        lastLoopTimeRef.current = now;

        // Increment loop count
        loopCountRef.current += 1;

        if (__DEV__) {
            logUI(LogCode.DEBUG_INFO, 'Loop completed', { loopCount: loopCountRef.current });
        }

        // If we haven't looped enough times yet, replay the video
        if (loopCountRef.current < 2) {
            if (__DEV__) {
                logUI(LogCode.DEBUG_INFO, 'Replaying video', { loopCount: loopCountRef.current, maxLoops: 2, videoId: activeVideoId });
            }
            videoPlayerRef.current?.seekTo(0);
            // Ensure video is playing after seek
            const isPausedNow = useActiveVideoStore.getState().isPaused;
            if (isPausedNow) {
                togglePause();
            }
            return;
        }

        // After 2 loops, finish the video
        setIsVideoFinished(true);
        setCleanScreen(false);

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
    }, [activeIndex, activeVideoId, viewingMode, setCleanScreen, togglePause]);

    const handleRemoveVideo = useCallback((index: number) => {
        const video = videosRef.current[index];
        if (video) {
            deleteVideo(video.id);
        }
    }, [deleteVideo]);

    // ======================================================================== 
    // Callbacks - UI Interactions
    // ======================================================================== 

    const showTapIndicator = useCallback((type: 'play' | 'pause') => {
        if (tapIndicatorTimeoutRef.current) clearTimeout(tapIndicatorTimeoutRef.current);
        setTapIndicator(type);
        tapIndicatorTimeoutRef.current = setTimeout(() => setTapIndicator(null), 1000);
    }, []);

    const handleFeedTap = useCallback(() => {
        if (DISABLE_NON_ACTIVE_UI) return;
        if (Date.now() - lastScrollEndRef.current < 150) return;
        if (Date.now() < doubleTapBlockUntilRef.current) return;
        if (actionButtonsPressingRef.current) return;

        // Handle restart when video is finished
        if (isVideoFinished) {
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

        if (activeTab === 'stories') {
            setActiveTab('foryou');
            setTimeout(() => {
                if (useActiveVideoStore.getState().isPaused) togglePause();
            }, 300);
        } else {
            const wasPaused = useActiveVideoStore.getState().isPaused;
            togglePause();
            showTapIndicator(wasPaused ? 'play' : 'pause');
        }
    }, [activeTab, isVideoFinished, togglePause, showTapIndicator]);

    const handleDoubleTapLike = useCallback((videoId: string) => {
        if (DISABLE_NON_ACTIVE_UI) return;
        if (Date.now() - lastScrollEndRef.current < 150) return;
        const targetVideo = videosRef.current.find((video) => video.id === videoId);
        if (!targetVideo) return;
        doubleTapBlockUntilRef.current = Date.now() + 350;
        if (!targetVideo.isLiked) {
            toggleLike(videoId);
        }
    }, [toggleLike]);

    const handlePressIn = useCallback((event: any) => {
        if (DISABLE_NON_ACTIVE_UI) return;
        lastPressXRef.current = event?.nativeEvent?.pageX ?? event?.nativeEvent?.locationX ?? null;
    }, []);

    const setPlaybackRateViaController = useCallback((rate: number) => {
        if (videoPlayerRef.current?.setPlaybackRate) {
            videoPlayerRef.current.setPlaybackRate(rate);
            return;
        }
        setPlaybackRate(rate);
    }, [setPlaybackRate]);

    const handleLongPress = useCallback((event: any) => {
        if (DISABLE_NON_ACTIVE_UI || DISABLE_GLOBAL_OVERLAYS) return;
        const pressX = lastPressXRef.current ?? event?.nativeEvent?.pageX ?? event?.nativeEvent?.locationX ?? 0;
        const isRightSide = pressX > SCREEN_WIDTH * 0.8;

        if (isRightSide) {
            wasSpeedBoostedRef.current = true;
            previousPlaybackRateRef.current = playbackRate;
            setPlaybackRateViaController(2.0);
            setRateLabel('2x');
            return;
        }

        if (wasSpeedBoostedRef.current) {
            wasSpeedBoostedRef.current = false;
            setPlaybackRateViaController(previousPlaybackRateRef.current);
            setRateLabel(null);
        }

        moreOptionsSheetRef.current?.snapToIndex(0);
        lastPressXRef.current = null;
    }, [playbackRate, setPlaybackRateViaController]);

    const handlePressOut = useCallback(() => {
        if (DISABLE_NON_ACTIVE_UI) return;
        if (!wasSpeedBoostedRef.current) return;
        wasSpeedBoostedRef.current = false;
        setPlaybackRateViaController(previousPlaybackRateRef.current);
        setRateLabel(null);
        lastPressXRef.current = null;
    }, [setPlaybackRateViaController]);

    const handleCarouselTouchStart = useCallback(() => {
        if (DISABLE_NON_ACTIVE_UI) return;
        _setIsCarouselInteracting(true);
    }, []);

    const handleCarouselTouchEnd = useCallback(() => {
        if (DISABLE_NON_ACTIVE_UI) return;
        _setIsCarouselInteracting(false);
    }, []);

    const handleActionPressIn = useCallback(() => {
        actionButtonsPressingRef.current = true;
    }, []);

    const handleActionPressOut = useCallback(() => {
        actionButtonsPressingRef.current = false;
    }, []);

    const handleSeek = useCallback((time: number) => {
        videoPlayerRef.current?.seekTo(time);
        currentTimeSV.value = time;
    }, [currentTimeSV]);

    const handleRetry = useCallback(() => {
        setHasVideoError(false);
        setRetryCount(0);
        videoPlayerRef.current?.retryActive();
    }, []);

    const playbackController = useMemo(() => ({
        seekTo: handleSeek,
        retryActive: handleRetry,
        setPlaybackRate: setPlaybackRateViaController,
    }), [handleSeek, handleRetry, setPlaybackRateViaController]);


    // ======================================================================== 
    // Callbacks - Actions
    // ======================================================================== 

    const handleToggleLike = useCallback(() => {
        if (activeVideo) toggleLike(activeVideo.id);
    }, [activeVideo, toggleLike]);

    const handleToggleSave = useCallback(() => {
        if (!activeVideo) return;
        const nextSaved = !activeVideo.isSaved;
        toggleSave(activeVideo.id);
        setSaveToastActive(nextSaved);
        showSaveToast(nextSaved ? 'Kaydedilenlere eklendi' : 'Kaydedilenlerden kaldırıldı');
    }, [activeVideo, toggleSave]);

    const handleToggleShare = useCallback(async () => {
        if (!activeVideo) return;

        const shareUrl = `wizyclub://video/${activeVideo.id}`;
        const message = activeVideo.description ? `${activeVideo.description}\n${shareUrl}` : shareUrl;

        const wasPaused = useActiveVideoStore.getState().isPaused;
        wasPlayingBeforeShareRef.current = !wasPaused;

        try {
            useActiveVideoStore.getState().setIgnoreAppState(true);
            if (!wasPaused) useActiveVideoStore.getState().setPaused(true);
            await Share.share({ message, url: shareUrl });
            toggleShare(activeVideo.id);
        } catch (error) {
            logError(LogCode.ERROR_CAUGHT, 'Share failed', error);
        } finally {
            if (activeVideoId === activeVideo.id) {
                const resumeTime = activeTimeRef.current;
                if (resumeTime > 0) videoPlayerRef.current?.seekTo(resumeTime);
                if (wasPlayingBeforeShareRef.current) useActiveVideoStore.getState().setPaused(false);
            }
            useActiveVideoStore.getState().setIgnoreAppState(false);
        }
    }, [activeVideo, activeVideoId, toggleShare]);

    const handleToggleFollow = useCallback(() => {
        if (activeVideo) toggleFollow(activeVideo.id);
    }, [activeVideo, toggleFollow]);

    const handleOpenShopping = useCallback(() => {
        if (!activeVideo?.brandUrl) {
            Alert.alert('Link bulunamadı', 'Bu video için bir alışveriş linki yok.');
            return;
        }
        const url = activeVideo.brandUrl.match(/^https?:\/\/./)
            ? activeVideo.brandUrl
            : `https://${activeVideo.brandUrl}`;
        openInAppBrowser(url);
    }, [activeVideo, openInAppBrowser]);

    const handleOpenDescription = useCallback(() => {
        descriptionSheetRef.current?.snapToIndex(0);
        if (!useActiveVideoStore.getState().isPaused) togglePause();
    }, [togglePause]);

    const handleCleanScreen = useCallback(() => {
        setCleanScreen(!isCleanScreen);
        moreOptionsSheetRef.current?.close();
        descriptionSheetRef.current?.close();
    }, [isCleanScreen, setCleanScreen]);

    const handleDeletePress = useCallback(() => {
        if (!activeVideoId) return;
        setDeleteModalVisible(true);
    }, [activeVideoId]);

    const handleSheetDelete = useCallback(() => {
        moreOptionsSheetRef.current?.close();
        handleDeletePress();
    }, [handleDeletePress]);

    // ======================================================================== 
    // Callbacks - Story/Tab
    // ======================================================================== 

    const handleStoryPress = useCallback(() => {
        setActiveTab('stories');
    }, []);

    const handleTabChange = useCallback((tab: 'stories' | 'foryou') => {
        setActiveTab(tab);
        if (tab === 'stories' && !useActiveVideoStore.getState().isPaused) {
            togglePause();
        }
    }, [togglePause]);

    const handleCloseStoryBar = useCallback(() => {
        setActiveTab('foryou');
        setTimeout(() => {
            if (useActiveVideoStore.getState().isPaused) togglePause();
        }, 300);
    }, [togglePause]);

    const handleStoryAvatarPress = useCallback((userId: string) => {
        router.push(`/story/${userId}`);
    }, [router]);

    // ======================================================================== 
    // Callbacks - Toast
    // ======================================================================== 

    const showSaveToast = useCallback((message: string) => {
        setSaveToastMessage(message);
        if (saveToastTimeoutRef.current) {
            clearTimeout(saveToastTimeoutRef.current);
            saveToastTimeoutRef.current = null;
        }
        saveToastTranslateY.setValue(-70);
        saveToastOpacity.setValue(0);
        RNAnimated.parallel([
            RNAnimated.timing(saveToastTranslateY, {
                toValue: 0,
                duration: 180,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            RNAnimated.timing(saveToastOpacity, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
            }),
        ]).start();
        saveToastTimeoutRef.current = setTimeout(() => {
            RNAnimated.parallel([
                RNAnimated.timing(saveToastTranslateY, {
                    toValue: -70,
                    duration: 180,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
                RNAnimated.timing(saveToastOpacity, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start(() => setSaveToastMessage(null));
        }, 2000);
    }, [saveToastOpacity, saveToastTranslateY]);

    // ======================================================================== 
    // Callbacks - Scroll
    // ======================================================================== 

    const getPrefetchIndices = useCallback((newIndex: number) => {
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

        for (let i = 1; i <= prefetchCount; i++) {
            const idx = forward ? newIndex + i : newIndex - i;
            if (idx >= 0 && idx <= maxIndex) indices.add(idx);
        }
        if (newIndex - 1 >= 0) indices.add(newIndex - 1);
        if (newIndex + 1 <= maxIndex) indices.add(newIndex + 1);

        return Array.from(indices);
    }, []);

    const setActiveFromIndex = useCallback((newIndex: number) => {
        if (newIndex < 0 || newIndex >= videosRef.current.length) return;
        const newVideo = videosRef.current[newIndex];
        const newId = newVideo?.id ?? null;
        if (!newId || newId === lastActiveIdRef.current) return;
        const isActiveCarousel = newVideo?.postType === 'carousel';

        lastInternalIndex.current = newIndex;
        lastActiveIdRef.current = newId;
        lastViewableIndexRef.current = newIndex;
        lastViewableTsRef.current = Date.now();
        setActiveVideo(newId, newIndex);
        setActiveTab('foryou');
        setCleanScreen(false);
        _setIsCarouselInteracting(false);

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

        // ✅ Defer prefetch to avoid blocking scroll
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
    }, [setActiveVideo, setCleanScreen, getPrefetchIndices]);

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken<Video>[] }) => {
            if (viewableItems.length === 0) return;
            const targetIndex = Math.floor(
                (scrollY.value + ITEM_HEIGHT * (1 - VIEWABILITY_THRESHOLD)) / ITEM_HEIGHT
            );
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

    const viewabilityConfigCallbackPairs = useRef([
        { viewabilityConfig: VIEWABILITY_CONFIG, onViewableItemsChanged },
    ]);

    const handleScrollEnd = useCallback((event: any) => {
        if (videos.length === 0) return;
        const offsetY = event.nativeEvent.contentOffset.y;
        const lastVideoOffset = (videos.length - 1) * ITEM_HEIGHT;
        if (offsetY > lastVideoOffset) {
            listRef.current?.scrollToIndex({ index: videos.length - 1, animated: true });
        }
    }, [videos.length]);

    // ======================================================================== 
    // Render helpers
    // ======================================================================== 

    const renderItem = useCallback(
        ({ item }: { item: Video }) => {
            const isActive = item.id === activeVideoId;
            return (
                <ScrollPlaceholder
                    video={item}
                    isActive={isActive}
                    isCleanScreen={isCleanScreen}
                    onDoubleTap={handleDoubleTapLike}
                    onSingleTap={handleFeedTap}
                    onLongPress={handleLongPress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    onCarouselTouchStart={handleCarouselTouchStart}
                    onCarouselTouchEnd={handleCarouselTouchEnd}
                />
            );
        },
        [
            activeVideoId,
            isCleanScreen,
            handleDoubleTapLike,
            handleFeedTap,
            handleLongPress,
            handlePressIn,
            handlePressOut,
            handleCarouselTouchStart,
            handleCarouselTouchEnd,
        ]
    );

    const keyExtractor = useCallback((item: Video) => item.id, []);

    const renderFooter = useCallback(() => {
        if (!isLoadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#FFF" />
            </View>
        );
    }, [isLoadingMore]);

    // ======================================================================== 
    // UI opacity animation (for seeking)
    // ======================================================================== 
    const uiOpacityStyle = useAnimatedStyle(() => ({
        opacity: 1,
    }), []);

    // ======================================================================== 
    // Loading state
    // ======================================================================== 

    if (isLoading && videos.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <FeedSkeleton />
            </View>
        );
    }

    if (error && videos.length === 0) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Text style={styles.retryText} onPress={refreshFeed}>
                    Tekrar Dene
                </Text>
            </View>
        );
    }

    if (!isLoading && videos.length === 0) {
        return (
            <View style={styles.container}>
                <ScrollView
                    contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={refreshFeed} tintColor="#FFFFFF" />
                    }
                >
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Henüz video yok</Text>
                        <Text style={[styles.emptySubtext, { marginTop: 10 }]}>İlk videoyu sen yükle!</Text>
                    </View>
                </ScrollView>

                {!isCleanScreen && (
                    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
                        <HeaderOverlay
                            isMuted={isMuted}
                            onToggleMute={toggleMute}
                            onStoryPress={handleStoryPress}
                            onUploadPress={() => router.push('/upload')}
                            activeTab={activeTab}
                            onTabChange={handleTabChange}
                            showBrightnessButton={false}
                            hasUnseenStories={hasUnseenStories}
                            showBack={isCustomFeed}
                            onBack={() => router.back()}
                        />
                    </Animated.View>
                )}
            </View>
        );
    }

    // ======================================================================== 
    // Main render
    // ======================================================================== 

    return (
        <SwipeWrapper
            onSwipeLeft={DISABLE_NON_ACTIVE_UI ? undefined : handleSwipeLeft}
            onSwipeRight={DISABLE_NON_ACTIVE_UI ? undefined : () => !isCustomFeed && router.push('/upload')}
            disabled={isCustomFeed || DISABLE_NON_ACTIVE_UI}
        >
            <View style={styles.container}>
                {/* ============================================================ 
                    Layer 1: VideoPlayerPool (z-index: 1)
                    3 pre-created players, zero creation during scroll
                    ============================================================ */}
                <VideoPlayerPool
                    ref={videoPlayerRef}
                    videos={videos}
                    activeIndex={activeIndex}
                    isMuted={isMuted}
                    isPaused={isPaused}
                    playbackRate={playbackRate}
                    onPlaybackRateChange={setPlaybackRate}
                    onVideoLoaded={handleVideoLoaded}
                    onVideoError={handleVideoError}
                    onProgress={handleVideoProgress}
                    onVideoEnd={handleVideoEnd}
                    onRemoveVideo={handleRemoveVideo}
                    scrollY={scrollY}
                />
                <BrightnessOverlay />

                {/* ============================================================ 
                    Layer 2: FlashList (z-index: 5)
                    Transparent scroll detection - MUST be above VideoPlayerPool
                    ============================================================ */}
                <View style={styles.scrollLayer}>
                    <AnimatedFlashList
                        // @ts-ignore
                        ref={listRef}
                        data={videos}
                        renderItem={renderItem}
                        estimatedItemSize={ITEM_HEIGHT}
                        // ✅ FIX #1: Pre-calculate all item layouts (eliminates layout thrashing)
                        overrideItemLayout={(layout, _item, _index) => {
                            layout.size = ITEM_HEIGHT;
                        }}
                        keyExtractor={keyExtractor}
                        // ✅ FIX #5: Faster cell recycling for smoother scroll
                        updateCellsBatchingPeriod={16}  // 1 frame at 60fps
                        // ✅ FIX #6: TikTok-style snap - only 1 video per swipe
                        pagingEnabled={false}  // Disable native paging
                        snapToInterval={ITEM_HEIGHT}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        disableIntervalMomentum={true}  // 🔥 Key fix: prevents multi-video skip
                        showsVerticalScrollIndicator={false}
                        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing}
                                onRefresh={refreshFeed}
                                tintColor="#FFFFFF"
                                progressViewOffset={insets.top}
                            />
                        }
                        onEndReached={hasMore ? loadMore : null}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={renderFooter}
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={1}  // ✅ Reduced from 3 for smoother scroll
                        windowSize={3}  // ✅ Reduced from 5, matches 3-slot player pool
                        drawDistance={ITEM_HEIGHT * 1.5}  // ✅ Only render 1.5 screens ahead/behind
                        initialNumToRender={1}
                        bounces={false}
                        overScrollMode="never"
                        scrollEnabled={!isCarouselInteracting}
                        nestedScrollEnabled={true}
                        onScroll={scrollHandler}
                        onScrollEndDrag={(e) => {
                            const velocityY = e.nativeEvent.velocity?.y ?? 0;
                            if (Math.abs(velocityY) < 0.25) {
                                lastScrollEndRef.current = Date.now();
                            }
                        }}
                        onMomentumScrollEnd={(e) => {
                            isScrollingSV.value = false;
                            lastScrollEndRef.current = Date.now();
                            handleScrollEnd(e);
                        }}
                    />
                </View>

                {/* ============================================================ 
                    Layer 3: ActiveVideoOverlay (z-index: 50)
                    All UI for active video, decoupled from video layer
                    ============================================================ */}
                {!DISABLE_ACTIVE_VIDEO_OVERLAY && activeVideo && !isCleanScreen && (
                    <ActiveVideoOverlay
                        data={{
                            video: activeVideo,
                            currentUserId,
                            activeIndex,
                            isPlayable: isActivePlayable,
                        }}
                        playback={{
                            isFinished: isVideoFinished,
                            hasError: hasVideoError,
                            retryCount,
                            isCleanScreen,
                            isSeeking,
                            tapIndicator,
                            rateLabel,
                        }}
                        timeline={{
                            currentTimeSV,
                            durationSV,
                            isScrollingSV,
                            scrollY,
                        }}
                        actions={{
                            onToggleLike: handleToggleLike,
                            onToggleSave: handleToggleSave,
                            onToggleShare: handleToggleShare,
                            onToggleFollow: handleToggleFollow,
                            onOpenShopping: handleOpenShopping,
                            onOpenDescription: handleOpenDescription,
                            playbackController,
                            onActionPressIn: handleActionPressIn,
                            onActionPressOut: handleActionPressOut,
                        }}
                    />
                )}

                {/* ============================================================ 
                    Layer 4: Global Overlays
                    ============================================================ */}
                {!DISABLE_GLOBAL_OVERLAYS && (
                    <>
                        {/* Save Toast */}
                        {saveToastMessage && (
                            <RNAnimated.View
                                pointerEvents="none"
                                style={[
                                    styles.saveToast,
                                    saveToastActive ? styles.saveToastActive : styles.saveToastInactive,
                                    {
                                        top: insets.top + 60,
                                        opacity: saveToastOpacity,
                                        transform: [{ translateY: saveToastTranslateY }],
                                    },
                                ]}
                            >
                                <View style={styles.saveToastContent}>
                                    <Bookmark
                                        size={18}
                                        color={SAVE_ICON_ACTIVE}
                                        fill={saveToastActive ? SAVE_ICON_ACTIVE : 'none'}
                                        strokeWidth={1.6}
                                    />
                                    <Text style={[styles.saveToastText, styles.saveToastTextActive]}>
                                        {saveToastMessage}
                                    </Text>
                                </View>
                            </RNAnimated.View>
                        )}

                        {/* Header Overlay */}
                        {!isCleanScreen && (
                            <Animated.View
                                style={[StyleSheet.absoluteFill, { zIndex: 100 }, uiOpacityStyle]}
                                pointerEvents={isSeeking ? 'none' : 'box-none'}
                            >
                                <HeaderOverlay
                                    isMuted={isMuted}
                                    onToggleMute={toggleMute}
                                    onStoryPress={handleStoryPress}
                                    onUploadPress={() => router.push('/upload')}
                                    activeTab={activeTab}
                                    onTabChange={handleTabChange}
                                    showBrightnessButton={false}
                                    hasUnseenStories={hasUnseenStories}
                                    showBack={isCustomFeed}
                                    onBack={() => router.back()}
                                />
                            </Animated.View>
                        )}

                        {/* Story Bar */}
                        {!isCleanScreen && showStories && (
                            <StoryBar
                                isVisible={activeTab === 'stories'}
                                storyUsers={storyUsers}
                                onAvatarPress={handleStoryAvatarPress}
                                onClose={handleCloseStoryBar}
                            />
                        )}

                        {/* Story touch interceptor */}
                        {!isCleanScreen && activeTab === 'stories' && (
                            <Pressable style={styles.touchInterceptor} onPress={handleCloseStoryBar} />
                        )}

                        {/* ============================================================ 
                            Layer 5: Bottom Sheets & Modals (z-index: 9999)
                            Must be above all other layers
                            ============================================================ */}
                        <View style={styles.sheetsContainer} pointerEvents="box-none">
                            {/* Bottom Sheets */}
                            <MoreOptionsSheet
                                ref={moreOptionsSheetRef}
                                onCleanScreenPress={handleCleanScreen}
                                onDeletePress={isOwnActiveVideo ? handleSheetDelete : undefined}
                                isCleanScreen={isCleanScreen}
                            />

                            <DescriptionSheet
                                ref={descriptionSheetRef}
                                video={activeVideo}
                                onFollowPress={() => activeVideoId && toggleFollow(activeVideoId)}
                                onChange={(index) => {
                                    if (index === -1 && useActiveVideoStore.getState().isPaused) {
                                        togglePause();
                                    }
                                }}
                            />

                            {/* Delete Modal */}
                            <DeleteConfirmationModal
                                visible={isDeleteModalVisible}
                                onCancel={() => setDeleteModalVisible(false)}
                                onConfirm={() => {
                                    if (activeVideoId) deleteVideo(activeVideoId);
                                    setDeleteModalVisible(false);
                                }}
                            />
                        </View>
                    </>
                )}
            </View>
        </SwipeWrapper>
    );
};

// ============================================================================ 
// Styles
// ============================================================================ 

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: COLORS.videoBackground,
    },
    errorContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
        marginBottom: 16,
    },
    retryText: {
        color: '#FFF',
        textDecorationLine: 'underline',
    },
    emptyContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#FFF',
    },
    emptySubtext: {
        color: '#aaa',
    },
    footerLoader: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    touchInterceptor: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
        backgroundColor: 'transparent',
    },
    sheetsContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
    },
    saveToast: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: 300,
        minWidth: 280,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 14,
        alignItems: 'center',
        overflow: 'hidden',
    },
    saveToastActive: {
        backgroundColor: '#2c2c2e',
    },
    saveToastInactive: {
        backgroundColor: '#2c2c2e',
    },
    saveToastText: {
        fontSize: 17,
        fontWeight: '400',
        zIndex: 1,
    },
    saveToastTextActive: {
        color: '#FFFFFF',
    },
    saveToastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scrollLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5,
    },
});
