import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    Pressable,
    ImageBackground,
    Share,
    Alert,
    useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import Video, { SelectedTrackType } from 'react-native-video';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, interpolate, Extrapolation } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import { Story } from '../../../domain/entities/Story';
import { StoryHeader } from './StoryHeader';
import { StoryActions } from './StoryActions';
import { FlyingEmoji } from './FlyingEmoji';
import { StoryMoreOptionsSheet } from './StoryMoreOptionsSheet';
import { StoryDeleteConfirmationModal } from './StoryDeleteConfirmationModal';
import { useRouter } from 'expo-router';
import PagerView from '../shared/PagerView';
import { CONFIG } from '../../../core/config';
import { COLORS } from '../../../core/constants';
import { useStoryStore } from '../../store/useStoryStore';
import { useAuthStore } from '../../store/useAuthStore';
import { StoryRepositoryImpl } from '../../../data/repositories/StoryRepositoryImpl';
import { useInAppBrowserStore } from '../../store/useInAppBrowserStore';
import { useActiveVideoStore } from '../../store/useActiveVideoStore';
import { logError, LogCode } from '../../../core/services/Logger';
import { StoryViewerSkeleton } from './StoryViewerSkeleton';
import { VideoCacheService } from '../../../data/services/VideoCacheService';

const { height: SCREEN_HEIGHT } = Dimensions.get('screen');
const IMAGE_STORY_DURATION_MS = 5000;
const PROGRESS_TICK_MS = 50;
const HOLD_PAUSE_DELAY_MS = 220;
const INITIAL_HOLD_GUARD_MS = 450;
const VIDEO_PROGRESS_CAP = 0.995;
const STAGE_MAX_WIDTH = 1080;
const STAGE_MAX_HEIGHT = 1920;
const STAGE_ASPECT_RATIO = STAGE_MAX_WIDTH / STAGE_MAX_HEIGHT; // 9:16
const STAGE_EXTRA_TOP_OFFSET = 25;
const SWIPE_CLOSE_DISTANCE = 130;
const SWIPE_CLOSE_VELOCITY = 1.1;
const SWIPE_CLOSE_MIN_DURATION_MS = 70;
const SWIPE_CLOSE_MAX_DURATION_MS = 180;

type StoryMediaType = 'video' | 'image';

interface ExpandedStory extends Story {
    originalId: string;
    mediaType: StoryMediaType;
}

interface FlyingEmojiData {
    id: string;
    emoji: string;
    x: number;
    y: number;
}

interface StoryViewerProps {
    stories: Story[];
    initialIndex?: number;
    onNext?: () => void;
    onPrev?: () => void;
}

function getCarouselMediaType(rawType?: string | null): StoryMediaType {
    const normalized = (rawType || '').toLowerCase();
    if (normalized.includes('video')) {
        return 'video';
    }
    return 'image';
}

export function StoryViewer({ stories, initialIndex = 0, onNext, onPrev }: StoryViewerProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
    const pagerRef = useRef<React.ElementRef<typeof PagerView>>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isPaused, setIsPaused] = useState(false);
    const [isLiked, setIsLiked] = useState(stories[initialIndex]?.isLiked || false);
    const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
    const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] = useState(false);
    const [isDeletingStory, setIsDeletingStory] = useState(false);
    const [deletedOriginalStoryIds, setDeletedOriginalStoryIds] = useState<Set<string>>(new Set());
    const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmojiData[]>([]);
    const currentUserId = useAuthStore((state) => state.user?.id);
    const isMuted = useActiveVideoStore((state) => state.isMuted);

    const holdReadyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const holdInteractionReadyRef = useRef(false);
    const longPressTriggeredRef = useRef(false);
    const isPausedRef = useRef(false);

    const videoRefs = useRef<Record<string, any>>({});
    const videoDurationsRef = useRef<Record<string, number>>({});
    const moreOptionsSheetRef = useRef<BottomSheet>(null);

    const progressTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const progressDurationMsRef = useRef(0);
    const progressPositionMsRef = useRef(0);
    const lastTickTsRef = useRef(0);
    const isVideoBufferingRef = useRef(false);
    const wasPausedBeforeMoreSheetRef = useRef(false);
    const keepPausedForDeleteModalRef = useRef(false);
    const pendingPageAfterDeleteRef = useRef<number | null>(null);
    const dragTranslateY = useSharedValue(0);
    const isSwipeClosing = useSharedValue(false);
    const activeStoryIdRef = useRef<string | null>(null);
    const loadedMediaIdsRef = useRef<Set<string>>(new Set());
    const [mediaReady, setMediaReady] = useState(false);
    const [resolvedVideoUrls, setResolvedVideoUrls] = useState<Record<string, string>>({});

    const visibleStories = useMemo(
        () => stories.filter((story) => !deletedOriginalStoryIds.has(story.id)),
        [deletedOriginalStoryIds, stories]
    );

    const expandedStories = useMemo<ExpandedStory[]>(() => {
        return visibleStories.flatMap((story) => {
            if (story.postType === 'carousel') {
                const items = Array.isArray(story.mediaUrls) && story.mediaUrls.length > 0
                    ? story.mediaUrls
                    : [{ url: story.videoUrl, thumbnail: story.thumbnailUrl, type: 'image' as const }];

                return items.map((media, subIndex) => ({
                    ...story,
                    id: `${story.id}-${subIndex}`,
                    originalId: story.id,
                    videoUrl: media.url,
                    thumbnailUrl: media.thumbnail || story.thumbnailUrl,
                    mediaType: getCarouselMediaType(media.type),
                }));
            }

            return [{
                ...story,
                originalId: story.id,
                mediaType: 'video' as const,
            }];
        });
    }, [visibleStories]);

    const progress = useSharedValue(0);
    const activeStory = expandedStories[currentIndex];
    const isOwnStory = !!currentUserId && activeStory?.user?.id === currentUserId;
    const markUserAsViewed = useStoryStore((state) => state.markUserAsViewed);
    const triggerStoryRefresh = useStoryStore((state) => state.triggerRefresh);
    const openInAppBrowser = useInAppBrowserStore((state) => state.openUrl);

    const setProgressFromPosition = useCallback((mediaType: StoryMediaType) => {
        const duration = progressDurationMsRef.current;
        if (duration <= 0) {
            progress.value = 0;
            return;
        }

        const raw = progressPositionMsRef.current / duration;
        const max = mediaType === 'video' ? VIDEO_PROGRESS_CAP : 1;
        progress.value = Math.min(Math.max(raw, 0), max);
    }, [progress]);

    const stopProgressTicker = useCallback(() => {
        if (progressTickerRef.current) {
            clearInterval(progressTickerRef.current);
            progressTickerRef.current = null;
        }
    }, []);

    const resetProgressEngine = useCallback(() => {
        stopProgressTicker();
        progressDurationMsRef.current = 0;
        progressPositionMsRef.current = 0;
        lastTickTsRef.current = 0;
        isVideoBufferingRef.current = false;
        progress.value = 0;
    }, [progress, stopProgressTicker]);

    const setPagerPage = useCallback((index: number, animated = true) => {
        const pager = pagerRef.current as any;
        if (!pager) return;

        if (!animated && typeof pager.setPageWithoutAnimation === 'function') {
            pager.setPageWithoutAnimation(index);
            return;
        }
        pager.setPage(index);
    }, []);

    const handleNext = useCallback(() => {
        if (currentIndex < expandedStories.length - 1) {
            setPagerPage(currentIndex + 1);
            return;
        }

        if (onNext) {
            onNext();
        } else {
            router.back();
        }
    }, [currentIndex, expandedStories.length, onNext, router, setPagerPage]);

    const startProgressTicker = useCallback((story: ExpandedStory | null) => {
        if (!story) return;
        if (progressTickerRef.current) return;

        // For videos, progress is driven entirely by video player callbacks.
        // Only start ticker for image stories.
        if (story.mediaType === 'video') return;

        lastTickTsRef.current = Date.now();
        progressDurationMsRef.current = IMAGE_STORY_DURATION_MS;
        progressTickerRef.current = setInterval(() => {
            const now = Date.now();
            const deltaMs = Math.max(0, now - lastTickTsRef.current);
            lastTickTsRef.current = now;

            if (isPausedRef.current) return;

            progressPositionMsRef.current += deltaMs;
            if (progressPositionMsRef.current >= IMAGE_STORY_DURATION_MS) {
                progressPositionMsRef.current = IMAGE_STORY_DURATION_MS;
                progress.value = 1;
                stopProgressTicker();
                handleNext();
                return;
            }

            setProgressFromPosition('image');
        }, PROGRESS_TICK_MS);
    }, [handleNext, progress, setProgressFromPosition, stopProgressTicker]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setPagerPage(currentIndex - 1);
            return;
        }

        if (onPrev) {
            onPrev();
        }
    }, [currentIndex, onPrev, setPagerPage]);

    const handleClose = useCallback(() => {
        router.back();
    }, [router]);

    const handleOpenMoreOptions = useCallback(() => {
        isSwipeClosing.value = false;
        dragTranslateY.value = 0;
        wasPausedBeforeMoreSheetRef.current = isPausedRef.current;
        setIsPaused(true);
        setIsMoreSheetOpen(true);
        moreOptionsSheetRef.current?.snapToIndex(0);
    }, [dragTranslateY, isSwipeClosing]);

    const handleMoreSheetStateChange = useCallback((isOpen: boolean) => {
        setIsMoreSheetOpen(isOpen);
        if (isOpen) {
            isSwipeClosing.value = false;
            dragTranslateY.value = 0;
            return;
        }

        isSwipeClosing.value = false;
        dragTranslateY.value = 0;
        const shouldResume = !wasPausedBeforeMoreSheetRef.current && !keepPausedForDeleteModalRef.current;
        wasPausedBeforeMoreSheetRef.current = false;
        if (shouldResume) {
            setIsPaused(false);
        }
    }, [dragTranslateY, isSwipeClosing]);

    const handleOpenDeleteConfirmation = useCallback(() => {
        keepPausedForDeleteModalRef.current = true;
        moreOptionsSheetRef.current?.close();
        setIsMoreSheetOpen(false);
        setIsDeleteConfirmationVisible(true);
        setIsPaused(true);
    }, []);

    const handleCancelDelete = useCallback(() => {
        keepPausedForDeleteModalRef.current = false;
        setIsDeleteConfirmationVisible(false);
        setIsPaused(false);
    }, []);

    const handleDeleteStory = useCallback(async () => {
        if (!isOwnStory || !activeStory?.originalId || isDeletingStory) return;

        keepPausedForDeleteModalRef.current = false;
        setIsDeleteConfirmationVisible(false);

        const token = useAuthStore.getState().session?.access_token;
        if (!token) {
            Alert.alert('Silme Başarısız', 'Oturum bulunamadı.');
            return;
        }

        wasPausedBeforeMoreSheetRef.current = true;
        setIsPaused(true);
        setIsDeletingStory(true);

        try {
            const response = await fetch(`${CONFIG.API_URL}/stories/${activeStory.originalId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'Sunucu hatası');
            }

            const deletedOriginalId = activeStory.originalId;
            const remainingStories = expandedStories.filter((story) => story.originalId !== deletedOriginalId);
            if (remainingStories.length > 0) {
                const nextIndex = Math.min(currentIndex, remainingStories.length - 1);
                pendingPageAfterDeleteRef.current = nextIndex;
                setCurrentIndex(nextIndex);
                setDeletedOriginalStoryIds((prev) => {
                    const next = new Set(prev);
                    next.add(deletedOriginalId);
                    return next;
                });
                setPagerPage(nextIndex, false);
                setIsPaused(false);
            } else {
                handleClose();
            }

            triggerStoryRefresh();
        } catch (error: any) {
            logError(LogCode.DB_DELETE, 'Story soft delete failed', {
                error,
                storyId: activeStory.originalId,
            });
            Alert.alert('Silme Başarısız', error?.message || 'Bilinmeyen hata');
            setIsPaused(false);
        } finally {
            setIsDeletingStory(false);
        }
    }, [activeStory?.originalId, currentIndex, expandedStories, handleClose, isDeletingStory, isOwnStory, setPagerPage, triggerStoryRefresh]);

    const dismissGesture = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetY(12)
                .failOffsetX([-15, 15])
                .enabled(!isMoreSheetOpen)
                .onUpdate((e) => {
                    'worklet';
                    if (isSwipeClosing.value) return;
                    dragTranslateY.value = Math.max(0, e.translationY);
                })
                .onEnd((e) => {
                    'worklet';
                    if (isSwipeClosing.value) return;

                    const travelY = Math.max(0, e.translationY);
                    const shouldClose =
                        travelY > SWIPE_CLOSE_DISTANCE ||
                        (travelY > SWIPE_CLOSE_DISTANCE * 0.4 && e.velocityY > SWIPE_CLOSE_VELOCITY * 1000);

                    if (!shouldClose) {
                        dragTranslateY.value = withSpring(0, {
                            damping: 20,
                            stiffness: 300,
                            mass: 0.8,
                        });
                        return;
                    }

                    isSwipeClosing.value = true;

                    const closeTarget = SCREEN_HEIGHT + 80;
                    const remaining = Math.max(0, closeTarget - travelY);
                    const rawDuration = (remaining / closeTarget) * SWIPE_CLOSE_MAX_DURATION_MS;
                    const duration = Math.max(
                        SWIPE_CLOSE_MIN_DURATION_MS,
                        Math.min(SWIPE_CLOSE_MAX_DURATION_MS, Math.round(rawDuration)),
                    );

                    dragTranslateY.value = withTiming(
                        closeTarget,
                        { duration },
                        (finished) => {
                            if (finished) {
                                runOnJS(handleClose)();
                            }
                        },
                    );
                }),
        [dragTranslateY, handleClose, isMoreSheetOpen, isSwipeClosing],
    );

    useEffect(() => {
        holdReadyTimeoutRef.current = setTimeout(() => {
            holdInteractionReadyRef.current = true;
        }, INITIAL_HOLD_GUARD_MS);

        return () => {
            if (holdReadyTimeoutRef.current) {
                clearTimeout(holdReadyTimeoutRef.current);
            }
            stopProgressTicker();
        };
    }, [stopProgressTicker]);

    useEffect(() => {
        const pendingIndex = pendingPageAfterDeleteRef.current;
        if (pendingIndex == null) return;
        if (expandedStories.length <= 0) {
            pendingPageAfterDeleteRef.current = null;
            return;
        }

        const safeIndex = Math.max(0, Math.min(pendingIndex, expandedStories.length - 1));
        pendingPageAfterDeleteRef.current = null;
        setPagerPage(safeIndex, false);
    }, [expandedStories.length, setPagerPage]);

    useEffect(() => {
        if (expandedStories.length <= 0) return;
        if (currentIndex <= expandedStories.length - 1) return;

        const safeIndex = expandedStories.length - 1;
        setCurrentIndex(safeIndex);
        setPagerPage(safeIndex, false);
    }, [currentIndex, expandedStories.length, setPagerPage]);

    useEffect(() => {
        if (deletedOriginalStoryIds.size <= 0) return;
        const liveIds = new Set(stories.map((story) => story.id));
        let changed = false;
        const next = new Set<string>();

        deletedOriginalStoryIds.forEach((storyId) => {
            if (liveIds.has(storyId)) {
                next.add(storyId);
                return;
            }
            changed = true;
        });

        if (changed) {
            setDeletedOriginalStoryIds(next);
        }
    }, [deletedOriginalStoryIds, stories]);

    useEffect(() => {
        if (!activeStory?.user?.id) return;

        markUserAsViewed(activeStory.user.id);
        new StoryRepositoryImpl().markAsViewed(activeStory.originalId).catch((err) =>
            logError(LogCode.STORY_VIEW_ERROR, 'Failed to mark story as viewed', {
                error: err,
                storyId: activeStory.originalId,
            })
        );
    }, [activeStory?.id, activeStory?.originalId, activeStory?.user?.id, markUserAsViewed]);

    useEffect(() => {
        if (!activeStory) return;

        longPressTriggeredRef.current = false;
        isSwipeClosing.value = false;
        dragTranslateY.value = 0;
        setIsLiked(activeStory.isLiked || false);
        setIsPaused(false);
        resetProgressEngine();
        activeStoryIdRef.current = activeStory.id;

        // Reset mediaReady: check if this media was already loaded
        setMediaReady(loadedMediaIdsRef.current.has(activeStory.id));

        if (activeStory.mediaType === 'image') {
            progressDurationMsRef.current = IMAGE_STORY_DURATION_MS;
            startProgressTicker(activeStory);
        } else {
            // For video: duration will be set by handleVideoLoad/handleVideoProgress.
            // Progress is driven entirely by video player callbacks.
            progressDurationMsRef.current = videoDurationsRef.current[activeStory.id] || 0;
        }
    }, [activeStory?.id, activeStory?.mediaType, dragTranslateY, resetProgressEngine, startProgressTicker]);

    // Resolve cached video URLs for all video stories
    useEffect(() => {
        let cancelled = false;
        const videoStories = expandedStories.filter(s => s.mediaType === 'video' && s.videoUrl);

        videoStories.forEach(async (story) => {
            const url = story.videoUrl;
            // Already resolved?
            if (resolvedVideoUrls[story.id]) return;

            // Try memory cache first (instant)
            const memoryCached = VideoCacheService.getMemoryCachedPath(url);
            if (memoryCached) {
                if (!cancelled) {
                    setResolvedVideoUrls(prev => ({ ...prev, [story.id]: memoryCached }));
                }
                return;
            }

            // Try disk cache, then download
            try {
                const cachedPath = await VideoCacheService.cacheVideo(url);
                if (cachedPath && !cancelled) {
                    setResolvedVideoUrls(prev => ({ ...prev, [story.id]: cachedPath }));
                }
            } catch (err) {
                // Silently fallback to network URL
            }
        });

        return () => { cancelled = true; };
    }, [expandedStories]);

    useEffect(() => {
        isPausedRef.current = isPaused;
        lastTickTsRef.current = Date.now();
    }, [isPaused]);

    const handleVideoLoad = useCallback((storyId: string) => (data: any) => {
        const durationMs = Number(data?.duration || 0) * 1000;
        if (durationMs <= 0) return;

        videoDurationsRef.current[storyId] = durationMs;
        if (activeStoryIdRef.current !== storyId) return;

        progressDurationMsRef.current = durationMs;
        progressPositionMsRef.current = Math.min(progressPositionMsRef.current, durationMs);
        setProgressFromPosition('video');
    }, [setProgressFromPosition]);

    const handleVideoProgress = useCallback((storyId: string) => (data: any) => {
        if (activeStoryIdRef.current !== storyId) return;
        if (isPausedRef.current) return;

        // Fallback: if progress fires, the video is playing — dismiss skeleton
        if (!loadedMediaIdsRef.current.has(storyId)) {
            loadedMediaIdsRef.current.add(storyId);
            setMediaReady(true);
        }

        const eventDurationMs = Math.max(
            Number(data?.seekableDuration || 0),
            Number(data?.playableDuration || 0),
            Number(data?.duration || 0)
        ) * 1000;

        if (eventDurationMs > 0) {
            videoDurationsRef.current[storyId] = eventDurationMs;
            progressDurationMsRef.current = eventDurationMs;
        }

        const currentMs = Number(data?.currentTime || 0) * 1000;
        progressPositionMsRef.current = Math.max(0, currentMs);
        if (progressDurationMsRef.current > 0) {
            setProgressFromPosition('video');
        }
    }, [setProgressFromPosition]);

    const handleVideoBuffer = useCallback((storyId: string) => (data: any) => {
        if (activeStoryIdRef.current !== storyId) return;
        isVideoBufferingRef.current = !!data?.isBuffering;
    }, []);

    const handleVideoEnd = useCallback(() => {
        progress.value = 1;
        handleNext();
    }, [handleNext, progress]);

    const handlePageSelected = useCallback((e: any) => {
        const newIndex = e.nativeEvent.position;
        const previousStory = expandedStories[currentIndex];
        const nextStory = expandedStories[newIndex];

        if (previousStory && videoRefs.current[previousStory.id]) {
            videoRefs.current[previousStory.id]?.seek(0);
        }

        setCurrentIndex(newIndex);
        progress.value = 0;

        if (nextStory?.mediaType === 'video') {
            setTimeout(() => {
                videoRefs.current[nextStory.id]?.seek(0);
            }, 100);
        }
    }, [currentIndex, expandedStories, progress]);

    const handleLongPressPause = useCallback(() => {
        if (!holdInteractionReadyRef.current) return;
        longPressTriggeredRef.current = true;
        setIsPaused(true);
    }, []);

    const handlePressOut = useCallback(() => {
        if (!longPressTriggeredRef.current) return;
        longPressTriggeredRef.current = false;
        setIsPaused(false);
    }, []);

    const handleTapLeft = useCallback(() => {
        if (longPressTriggeredRef.current) return;
        handlePrev();
    }, [handlePrev]);

    const handleTapRight = useCallback(() => {
        if (longPressTriggeredRef.current) return;
        handleNext();
    }, [handleNext]);

    const handleLike = useCallback(() => {
        setIsLiked((prev) => !prev);
    }, []);

    const handleShare = useCallback(async () => {
        const shareUrl = activeStory?.videoUrl || activeStory?.thumbnailUrl;
        if (!shareUrl) return;

        const wasPaused = isPaused;
        setIsPaused(true);
        try {
            await Share.share({ message: shareUrl, url: shareUrl });
        } catch (error) {
            logError(LogCode.SHARE_ERROR, 'Story share failed', { error, storyId: activeStory?.id });
        } finally {
            setIsPaused(wasPaused);
        }
    }, [activeStory?.id, activeStory?.thumbnailUrl, activeStory?.videoUrl, isPaused]);

    const handleShop = useCallback(() => {
        const rawUrl = activeStory?.brandUrl;
        if (!rawUrl) {
            Alert.alert('Link bulunamadı', 'Bu story için bir alışveriş linki yok.');
            return;
        }
        const url = rawUrl.match(/^https?:\/\//) ? rawUrl : `https://${rawUrl}`;
        setIsPaused(true);
        openInAppBrowser(url);
    }, [activeStory?.brandUrl, openInAppBrowser]);

    const handleEmojiSelect = useCallback((emoji: string) => {
        const newEmoji: FlyingEmojiData = {
            id: Date.now().toString(),
            emoji,
            x: Math.random() * 200 + 100,
            y: SCREEN_HEIGHT * 0.5,
        };
        setFlyingEmojis((prev) => [...prev, newEmoji]);
        setTimeout(() => {
            setFlyingEmojis((prev) => prev.filter((e) => e.id !== newEmoji.id));
        }, 2000);
    }, []);

    if (!activeStory) {
        return <View style={styles.container} />;
    }

    const mediaResizeMode: 'contain' = 'contain';
    const imageContentFit: 'contain' = 'contain';
    const stageSize = useMemo(() => {
        const boundedWidth = Math.min(viewportWidth, STAGE_MAX_WIDTH);
        const boundedHeight = Math.min(viewportHeight, STAGE_MAX_HEIGHT);

        let width = boundedWidth;
        let height = width / STAGE_ASPECT_RATIO;

        if (height > boundedHeight) {
            height = boundedHeight;
            width = height * STAGE_ASPECT_RATIO;
        }

        return { width, height };
    }, [viewportHeight, viewportWidth]);

    const animatedContainerStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            dragTranslateY.value,
            [0, viewportHeight * 0.6],
            [1, 0.5],
            Extrapolation.CLAMP,
        );
        return {
            transform: [{ translateY: dragTranslateY.value }],
            opacity,
        };
    });

    return (
        <GestureDetector gesture={dismissGesture}>
            <Animated.View
                style={[
                    styles.container,
                    animatedContainerStyle,
                ]}
            >
                <ImageBackground
                    source={{ uri: activeStory.thumbnailUrl }}
                    style={StyleSheet.absoluteFill}
                    blurRadius={50}
                >
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                </ImageBackground>

                <View style={styles.videoArea}>
                    <View style={[styles.stageWrapper, { paddingTop: insets.top + STAGE_EXTRA_TOP_OFFSET }]}>
                        <View style={[styles.stage, stageSize]}>
                            <PagerView
                                ref={pagerRef}
                                style={StyleSheet.absoluteFill}
                                initialPage={initialIndex}
                                onPageSelected={handlePageSelected}
                                orientation="horizontal"
                                overdrag={false}
                                scrollEnabled={true}
                            >
                                {expandedStories.map((story, index) => (
                                    <View key={story.id} style={styles.page}>
                                        {story.mediaType === 'video' ? (
                                            <Video
                                                ref={(ref) => { videoRefs.current[story.id] = ref; }}
                                                source={{ uri: resolvedVideoUrls[story.id] || story.videoUrl }}
                                                style={styles.video}
                                                resizeMode={mediaResizeMode}
                                                repeat={false}
                                                paused={isPaused || index !== currentIndex}
                                                muted={isMuted}
                                                selectedAudioTrack={isMuted ? { type: SelectedTrackType.DISABLED } : undefined}
                                                progressUpdateInterval={50}
                                                onLoad={handleVideoLoad(story.id)}
                                                onReadyForDisplay={() => {
                                                    if (!loadedMediaIdsRef.current.has(story.id)) {
                                                        loadedMediaIdsRef.current.add(story.id);
                                                    }
                                                    if (activeStoryIdRef.current === story.id) {
                                                        setMediaReady(true);
                                                    }
                                                }}
                                                onProgress={index === currentIndex ? handleVideoProgress(story.id) : undefined}
                                                onBuffer={index === currentIndex ? handleVideoBuffer(story.id) : undefined}
                                                onEnd={index === currentIndex ? handleVideoEnd : undefined}
                                                onError={() => {
                                                    if (activeStoryIdRef.current === story.id) {
                                                        setMediaReady(true);
                                                    }
                                                }}
                                                ignoreSilentSwitch="ignore"
                                                mixWithOthers={isMuted ? 'mix' : undefined}
                                                disableFocus={isMuted}
                                            />
                                        ) : (
                                            <Image
                                                source={{ uri: story.videoUrl }}
                                                style={styles.video}
                                                contentFit={imageContentFit}
                                                priority="high"
                                                cachePolicy="memory-disk"
                                                onLoad={() => {
                                                    loadedMediaIdsRef.current.add(story.id);
                                                    if (activeStoryIdRef.current === story.id) {
                                                        setMediaReady(true);
                                                    }
                                                }}
                                                onError={() => {
                                                    if (activeStoryIdRef.current === story.id) {
                                                        setMediaReady(true);
                                                    }
                                                }}
                                            />
                                        )}
                                    </View>
                                ))}
                            </PagerView>

                            <View style={styles.tapZones} pointerEvents="box-none">
                                <Pressable
                                    style={styles.leftZone}
                                    onPress={handleTapLeft}
                                    onLongPress={handleLongPressPause}
                                    delayLongPress={HOLD_PAUSE_DELAY_MS}
                                    onPressOut={handlePressOut}
                                />
                                <Pressable
                                    style={styles.rightZone}
                                    onPress={handleTapRight}
                                    onLongPress={handleLongPressPause}
                                    delayLongPress={HOLD_PAUSE_DELAY_MS}
                                    onPressOut={handlePressOut}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                <StoryHeader
                    story={activeStory as Story}
                    progress={progress}
                    totalStories={expandedStories.length}
                    currentStoryIndex={currentIndex}
                    onClose={handleClose}
                    onMorePress={handleOpenMoreOptions}
                />

                {!mediaReady && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                        <StoryViewerSkeleton />
                    </View>
                )}

                <View style={styles.actionsOverlay} pointerEvents="box-none">
                    <StoryActions
                        isLiked={isLiked}
                        onLike={handleLike}
                        onShare={handleShare}
                        onShop={handleShop}
                        showShop={!!activeStory.brandUrl}
                        onEmojiSelect={handleEmojiSelect}
                        overlay
                    />
                </View>

                <View
                    style={styles.sheetsContainer}
                    pointerEvents={isMoreSheetOpen ? 'box-none' : 'none'}
                >
                    {isMoreSheetOpen && !isDeleteConfirmationVisible ? (
                        <Pressable
                            style={styles.sheetDismissOverlay}
                            onPress={() => moreOptionsSheetRef.current?.close()}
                        />
                    ) : null}
                    <StoryMoreOptionsSheet
                        ref={moreOptionsSheetRef}
                        isOwnStory={isOwnStory}
                        onDeletePress={isOwnStory ? handleOpenDeleteConfirmation : undefined}
                        onSheetStateChange={handleMoreSheetStateChange}
                    />
                </View>

                <StoryDeleteConfirmationModal
                    visible={isDeleteConfirmationVisible}
                    onCancel={handleCancelDelete}
                    onConfirm={handleDeleteStory}
                />

                {flyingEmojis.map((emojiData) => (
                    <FlyingEmoji
                        key={emojiData.id}
                        emoji={emojiData.emoji}
                        startX={emojiData.x}
                        startY={emojiData.y}
                    />
                ))}
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.videoBackground,
    },
    videoArea: {
        flex: 1,
        backgroundColor: COLORS.videoBackground,
    },
    page: {
        flex: 1,
        backgroundColor: COLORS.videoBackground,
    },
    stageWrapper: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    stage: {
        overflow: 'hidden',
        backgroundColor: COLORS.videoBackground,
    },
    actionsOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 120,
    },
    sheetsContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 220,
    },
    sheetDismissOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    video: {
        flex: 1,
        backgroundColor: COLORS.videoBackground,
    },
    tapZones: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        zIndex: 10,
    },
    leftZone: {
        flex: 0.3,
    },
    rightZone: {
        flex: 0.7,
    },
});
