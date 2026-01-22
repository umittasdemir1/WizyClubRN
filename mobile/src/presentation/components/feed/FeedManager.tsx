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
    TouchableOpacity,
    Animated as RNAnimated,
    Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderOverlay } from './HeaderOverlay';
import { FeedItem } from './FeedItem';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { DescriptionSheet } from '../sheets/DescriptionSheet';
import { MoreOptionsSheet } from '../sheets/MoreOptionsSheet';
import {
    useActiveVideoStore,
    useAppStateSync,
    useMuteControls,
} from '../../store/useActiveVideoStore';
import { Video } from '../../../domain/entities/Video';
import { useState, useRef, useCallback, useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
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

const SCREEN_WIDTH = Dimensions.get('window').width;
const SAVE_ICON_ACTIVE = '#FFFFFF';

const VIEWABILITY_CONFIG = {
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 100,
};

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
    toggleShop,
    deleteVideo,
    prependVideo,
    showStories = true,
    isCustomFeed = false,
}: FeedManagerProps) => {
    const setActiveVideo = useActiveVideoStore((state) => state.setActiveVideo);
    const activeVideoId = useActiveVideoStore((state) => state.activeVideoId);
    const isSeeking = useActiveVideoStore((state) => state.isSeeking);
    const togglePause = useActiveVideoStore((state) => state.togglePause);
    const setScreenFocused = useActiveVideoStore((state) => state.setScreenFocused);
    const activeIndex = useActiveVideoStore((state) => state.activeIndex);
    const isCleanScreen = useActiveVideoStore((state) => state.isCleanScreen);
    const setCleanScreen = useActiveVideoStore((state) => state.setCleanScreen);
    const playbackRate = useActiveVideoStore((state) => state.playbackRate);
    const viewingMode = useActiveVideoStore((state) => state.viewingMode);
    const setPlaybackRate = useActiveVideoStore((state) => state.setPlaybackRate);
    const [tapIndicator, setTapIndicator] = useState<null | 'play' | 'pause'>(null);
    const tapIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { stories: storyListData } = useStoryViewer();

    // Group stories by user for StoryBar
    const storyUsers = React.useMemo(() => {
        return storyListData.reduce((acc: any[], story) => {
            const existing = acc.find(u => u.id === story.user.id);
            if (!existing) {
                acc.push({
                    id: story.user.id,
                    username: story.user.username,
                    avatarUrl: story.user.avatarUrl,
                    hasUnseenStory: !story.isViewed
                });
            } else if (!story.isViewed) {
                existing.hasUnseenStory = true;
            }
            return acc;
        }, []);
    }, [storyListData]);

    const uploadStatus = useUploadStore(state => state.status);
    const uploadedVideoId = useUploadStore(state => state.uploadedVideoId);
    const resetUpload = useUploadStore(state => state.reset);
    const markStartupComplete = useStartupStore(state => state.markStartupComplete);
    // Watch for upload success -> Fetch new video and prepend to feed
    useEffect(() => {
        if (uploadedVideoId && uploadStatus === 'success' && prependVideo && !isCustomFeed) {
            // Logic to fetch and prepend - simplified for the component but keeping original intent
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
    }, [uploadedVideoId, uploadStatus]);

    // Mute controls
    const { isMuted, toggleMute } = useMuteControls();

    // Tab State
    const [activeTab, setActiveTab] = useState<'stories' | 'foryou'>('foryou');

    // Delete modal state
    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
    const isInAppBrowserVisible = useInAppBrowserStore((state) => state.isVisible);
    const openInAppBrowser = useInAppBrowserStore((state) => state.openUrl);
    const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);
    const [saveToastActive, setSaveToastActive] = useState(false);
    const [isCarouselInteracting, setIsCarouselInteracting] = useState(false);

    // Sheet refs
    const descriptionSheetRef = useRef<BottomSheet>(null);
    const moreOptionsSheetRef = useRef<BottomSheet>(null);

    // App State Sync
    useAppStateSync();

    // Video progress
    const isScrollingSV = useSharedValue(false);
    const videoSeekRef = useRef<((time: number) => void) | null>(null);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const listRef = useRef<any>(null);
    const wasPlayingBeforeWebViewRef = useRef(false);
    const activeDurationRef = useRef(0);
    const activeTimeRef = useRef(0);
    const wasPlayingBeforeShareRef = useRef(false);
    const saveToastTranslateY = useRef(new RNAnimated.Value(-70)).current;
    const saveToastOpacity = useRef(new RNAnimated.Value(0)).current;
    const saveToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const actionButtonsPressingRef = useRef(false);
    const doubleTapBlockUntilRef = useRef(0);

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
            ]).start(() => {
                setSaveToastMessage(null);
            });
        }, 2000);
    }, [saveToastOpacity, saveToastTranslateY]);
    const ITEM_HEIGHT = Dimensions.get('window').height;


    const videosRef = useRef(videos);
    useEffect(() => {
        videosRef.current = videos;
    }, [videos]);

    useEffect(() => {
        if (isInAppBrowserVisible) {
            const isPaused = useActiveVideoStore.getState().isPaused;
            wasPlayingBeforeWebViewRef.current = !isPaused;
            if (!isPaused) {
                togglePause();
            }
            return;
        }

        if (wasPlayingBeforeWebViewRef.current) {
            const isPaused = useActiveVideoStore.getState().isPaused;
            if (isPaused) {
                togglePause();
            }
            wasPlayingBeforeWebViewRef.current = false;
        }
    }, [isInAppBrowserVisible, togglePause]);

    useEffect(() => {
        return () => {
            if (saveToastTimeoutRef.current) {
                clearTimeout(saveToastTimeoutRef.current);
            }
        };
    }, []);

    useFocusEffect(
        useCallback(() => {
            SystemBars.setStyle({
                statusBar: 'light',
                navigationBar: 'light',
            });
        }, [])
    );

    const isScreenFocusedRef = useRef(false);

    useFocusEffect(
        useCallback(() => {
            isScreenFocusedRef.current = true;
            setScreenFocused(true);
            setActiveTab('foryou');

            if (videosRef.current.length > 0 && !lastActiveIdRef.current) {
                // 🔧 FIX: İlk video için direkt active yap (deprecated method kullan)
                setActiveVideo(videosRef.current[0].id, 0);
            }

            return () => {
                isScreenFocusedRef.current = false;
                setScreenFocused(false);
            };
        }, [setScreenFocused, setActiveVideo])
    );

    // Fast init
    useEffect(() => {
        if (videos.length > 0 && !activeVideoId) {
            setActiveVideo(videos[0].id, 0);
            lastActiveIdRef.current = videos[0].id;
        }
    }, [videos, activeVideoId, setActiveVideo]);

    const hasUnseenStories = storyUsers.some((u: any) => u.hasUnseenStory);

    const uiOpacityStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(isSeeking ? 0 : 1, { duration: 200 })
        };
    }, [isSeeking]);

    const lastInternalIndex = useRef(activeIndex);
    const lastViewableIndexRef = useRef(0);
    const lastViewableTsRef = useRef(0);

    useEffect(() => {
        if (videos.length > 0 && activeIndex !== lastInternalIndex.current) {
            listRef.current?.scrollToIndex({
                index: activeIndex,
                animated: false,
            });
            lastInternalIndex.current = activeIndex;
        }
    }, [activeIndex, videos.length]);

    const lastActiveIdRef = useRef<string | null>(activeVideoId);
    useEffect(() => {
        lastActiveIdRef.current = activeVideoId;
    }, [activeVideoId]);

    const getPrefetchIndices = useCallback((newIndex: number) => {
        const now = Date.now();
        const lastIndex = lastViewableIndexRef.current;
        const lastTs = lastViewableTsRef.current || now;
        const deltaIndex = Math.abs(newIndex - lastIndex);
        const deltaMs = Math.max(1, now - lastTs);
        const fastSwipe = deltaIndex > 1 || deltaMs < 350;
        const forward = newIndex >= lastIndex;
        const prefetchCount = fastSwipe ? 5 : 3;
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

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken<Video>[] }) => {
            if (viewableItems.length > 0) {
                const newIndex = viewableItems[0].index ?? 0;
                const newId = viewableItems[0].item?.id ?? null;

                if (newId && newId !== lastActiveIdRef.current) {
                    lastInternalIndex.current = newIndex;
                    lastActiveIdRef.current = newId;
                    lastViewableIndexRef.current = newIndex;
                    lastViewableTsRef.current = Date.now();
                    setActiveVideo(newId, newIndex);
                    setActiveTab('foryou');
                    setCleanScreen(false);
                    FeedPrefetchService.getInstance().queueVideos(
                        videosRef.current,
                        getPrefetchIndices(newIndex)
                    );
                }
            }
        },
        [setActiveVideo, setCleanScreen, getPrefetchIndices]
    );

    const viewabilityConfigCallbackPairs = useRef([
        {
            viewabilityConfig: VIEWABILITY_CONFIG,
            onViewableItemsChanged,
        },
    ]);

    const handleToggleMute = useCallback(() => {
        toggleMute();
    }, [toggleMute]);

    const wasSpeedBoostedRef = useRef(false);
    const previousPlaybackRateRef = useRef(playbackRate);
    const lastPressXRef = useRef<number | null>(null);

    useEffect(() => {
        if (!wasSpeedBoostedRef.current) {
            previousPlaybackRateRef.current = playbackRate;
        }
    }, [playbackRate]);

    const handlePressIn = useCallback((event: any) => {
        lastPressXRef.current = event?.nativeEvent?.pageX ?? event?.nativeEvent?.locationX ?? null;
    }, []);

    const handleLongPress = useCallback((event: any) => {
        const pressX = lastPressXRef.current ?? event?.nativeEvent?.pageX ?? event?.nativeEvent?.locationX ?? 0;
        const screenWidth = Dimensions.get('window').width;
        const isRightSide = pressX > screenWidth * 0.8;

        if (isRightSide) {
            wasSpeedBoostedRef.current = true;
            previousPlaybackRateRef.current = playbackRate;
            setPlaybackRate(2.0);
            return;
        }

        if (wasSpeedBoostedRef.current) {
            wasSpeedBoostedRef.current = false;
            setPlaybackRate(previousPlaybackRateRef.current);
        }

        moreOptionsSheetRef.current?.snapToIndex(0);
        lastPressXRef.current = null;
    }, [playbackRate, setPlaybackRate]);

    const handlePressOut = useCallback(() => {
        if (!wasSpeedBoostedRef.current) return;
        wasSpeedBoostedRef.current = false;
        setPlaybackRate(previousPlaybackRateRef.current);
        lastPressXRef.current = null;
    }, [setPlaybackRate]);

    const handleCleanScreen = useCallback(() => {
        const nextCleanScreen = !isCleanScreen;
        setCleanScreen(nextCleanScreen);
        moreOptionsSheetRef.current?.close();
        descriptionSheetRef.current?.close();
    }, [isCleanScreen, setCleanScreen]);

    const handleStoryPress = useCallback(() => {
        setActiveTab('stories');
    }, []);

    const handleTabChange = useCallback((tab: 'stories' | 'foryou') => {
        setActiveTab(tab);
        if (tab === 'stories') {
            if (!useActiveVideoStore.getState().isPaused) {
                togglePause();
            }
        }
    }, [togglePause]);

    const handleCloseStoryBar = useCallback(() => {
        setActiveTab('foryou');
        setTimeout(() => {
            if (useActiveVideoStore.getState().isPaused) {
                togglePause();
            }
        }, 300);
    }, [togglePause]);

    const showTapIndicator = useCallback((type: 'play' | 'pause') => {
        if (tapIndicatorTimeoutRef.current) {
            clearTimeout(tapIndicatorTimeoutRef.current);
        }
        setTapIndicator(type);
        tapIndicatorTimeoutRef.current = setTimeout(() => {
            setTapIndicator(null);
        }, 1000);
    }, []);

    useEffect(() => {
        return () => {
            if (tapIndicatorTimeoutRef.current) {
                clearTimeout(tapIndicatorTimeoutRef.current);
            }
        };
    }, []);

    const handleFeedTap = useCallback(() => {
        if (Date.now() < doubleTapBlockUntilRef.current) {
            return;
        }
        if (actionButtonsPressingRef.current) {
            return;
        }
        if (activeTab === 'stories') {
            handleCloseStoryBar();
        } else {
            const wasPaused = useActiveVideoStore.getState().isPaused;
            togglePause();
            showTapIndicator(wasPaused ? 'play' : 'pause');
        }
    }, [activeTab, handleCloseStoryBar, togglePause, showTapIndicator]);

    const handleActionButtonsPressIn = useCallback(() => {
        actionButtonsPressingRef.current = true;
    }, []);

    const handleActionButtonsPressOut = useCallback(() => {
        actionButtonsPressingRef.current = false;
    }, []);

    const handleStoryAvatarPress = useCallback((userId: string) => {
        router.push(`/story/${userId}`);
    }, [router]);

    const handleOpenDescription = useCallback(() => {
        descriptionSheetRef.current?.snapToIndex(0);
        if (!useActiveVideoStore.getState().isPaused) {
            togglePause();
        }
    }, [togglePause]);

    const handleOpenShopping = useCallback(async (videoId: string) => {
        const video = videosRef.current.find((v) => v.id === videoId);
        const rawUrl = video?.brandUrl;

        if (!rawUrl) {
            Alert.alert('Link bulunamadı', 'Bu video için bir alışveriş linki yok.');
            return;
        }

        const url = rawUrl.match(/^https?:\/\//) ? rawUrl : `https://${rawUrl}`;
        openInAppBrowser(url);
    }, [openInAppBrowser]);

    const handleDeletePress = useCallback(() => {
        if (!activeVideoId) return;
        setDeleteModalVisible(true);
    }, [activeVideoId]);

    const handleSheetDelete = useCallback(() => {
        moreOptionsSheetRef.current?.close();
        handleDeletePress();
    }, [handleDeletePress]);

    const handleDoubleTapLike = useCallback(
        (videoId: string) => {
            doubleTapBlockUntilRef.current = Date.now() + 350;
            const video = videos.find((v) => v.id === videoId);
            if (video && !video.isLiked) {
                toggleLike(videoId);
            }
        },
        [videos, toggleLike]
    );

    const handleVideoEnd = useCallback(() => {
        setCleanScreen(false);
        const shouldAdvance =
            viewingMode === 'full' || (viewingMode === 'fast' && activeDurationRef.current > 0 && activeDurationRef.current <= 10);
        if (shouldAdvance) {
            const currentIndex = activeVideoId
                ? videosRef.current.findIndex((v) => v.id === activeVideoId)
                : activeIndex;
            const safeIndex = currentIndex >= 0 ? currentIndex : activeIndex;
            const nextIndex = Math.min(safeIndex + 1, videosRef.current.length - 1);
            if (nextIndex !== safeIndex) {
                listRef.current?.scrollToOffset({
                    offset: nextIndex * ITEM_HEIGHT,
                    animated: true,
                });
            }
        }
    }, [setCleanScreen, viewingMode, activeIndex, activeVideoId]);

    const autoAdvanceGuardRef = useRef<string | null>(null);
    const handleProgressUpdate = useCallback((currentTime: number, duration: number) => {
        activeTimeRef.current = currentTime;
        if (viewingMode !== 'fast') return;
        if (!activeVideoId) return;
        if (duration > 0) {
            activeDurationRef.current = duration;
        }
        if (duration > 0 && duration <= 10) return;
        if (currentTime < 10) return;
        if (autoAdvanceGuardRef.current === activeVideoId) return;
        autoAdvanceGuardRef.current = activeVideoId;
        const currentIndex = activeVideoId
            ? videosRef.current.findIndex((v) => v.id === activeVideoId)
            : activeIndex;
        const safeIndex = currentIndex >= 0 ? currentIndex : activeIndex;
        const nextIndex = Math.min(safeIndex + 1, videosRef.current.length - 1);
        if (nextIndex !== safeIndex) {
            listRef.current?.scrollToOffset({
                offset: nextIndex * ITEM_HEIGHT,
                animated: true,
            });
        }
    }, [viewingMode, activeVideoId, activeIndex]);

    useEffect(() => {
        autoAdvanceGuardRef.current = null;
    }, [activeVideoId, viewingMode]);

    const handleSeekReady = useCallback((seekFn: (time: number) => void) => {
        videoSeekRef.current = seekFn;
    }, []);

    const handleScrollEnd = useCallback((event: any) => {
        if (videos.length === 0) return;
        const offsetY = event.nativeEvent.contentOffset.y;
        const lastVideoOffset = (videos.length - 1) * ITEM_HEIGHT;
        if (offsetY > lastVideoOffset) {
            listRef.current?.scrollToIndex({ index: videos.length - 1, animated: true });
        }
    }, [videos.length, ITEM_HEIGHT]);

    const handleRemoveVideo = useCallback((videoId: string) => {
        deleteVideo(videoId);
    }, [deleteVideo]);

    const handleSharePress = useCallback(async (videoId: string) => {
        const video = videosRef.current.find((v) => v.id === videoId);
        if (!video) return;

        const shareUrl = `wizyclub://video/${videoId}`;
        const message = video.description ? `${video.description}\n${shareUrl}` : shareUrl;

        const wasPaused = useActiveVideoStore.getState().isPaused;
        wasPlayingBeforeShareRef.current = !wasPaused;

        try {
            useActiveVideoStore.getState().setIgnoreAppState(true);
            if (!wasPaused) {
                useActiveVideoStore.getState().setPaused(true);
            }
            await Share.share({ message, url: shareUrl });
            toggleShare(videoId);
        } catch (error) {
            console.error('[Share] Failed to open share sheet:', error);
        } finally {
            if (activeVideoId === videoId) {
                const resumeTime = activeTimeRef.current;
                if (resumeTime > 0) {
                    videoSeekRef.current?.(resumeTime);
                }
                if (wasPlayingBeforeShareRef.current) {
                    useActiveVideoStore.getState().setPaused(false);
                }
            }
            useActiveVideoStore.getState().setIgnoreAppState(false);
        }
    }, [activeVideoId, toggleShare]);

    const handleToggleSave = useCallback((videoId: string) => {
        const video = videosRef.current.find((v) => v.id === videoId);
        const nextSaved = !video?.isSaved;
        toggleSave(videoId);
        setSaveToastActive(nextSaved);
        showSaveToast(nextSaved ? 'Kaydedilenlere eklendi' : 'Kaydedilenlerden kaldırıldı');
    }, [showSaveToast, toggleSave]);

    const handleCarouselTouchStart = useCallback(() => {
        setIsCarouselInteracting(true);
    }, []);

    const handleCarouselTouchEnd = useCallback(() => {
        setIsCarouselInteracting(false);
    }, []);

    const { user } = useAuthStore();
    const currentUserId = user?.id;
    const activeVideo = videos.find((v) => v.id === activeVideoId) || null;
    const isOwnActiveVideo = !!activeVideo && activeVideo.user?.id === currentUserId;

    const renderItem = useCallback(
        ({ item, index }: { item: Video; index: number }) => {
            const isActive = item.id === activeVideoId;

            // 🚀 PRE-MOUNTING STRATEGY (Zero-Latency Feed)
            // Mount players for: Previous + Current + Next
            // Only CURRENT plays, others stay paused but initialized
            const shouldLoad =
                index === activeIndex ||      // Current video (playing)
                index === activeIndex - 1 ||  // Previous video (paused, ready for swipe up)
                index === activeIndex + 1;    // Next video (paused, ready for swipe down)

            return (
                <FeedItem
                    video={item}
                    shouldLoad={shouldLoad}
                    isActive={isActive}
                    isMuted={isMuted}
                    isScrolling={isScrollingSV}
                    isSeeking={isSeeking}
                    uiOpacityStyle={uiOpacityStyle}
                    isCleanScreen={isCleanScreen}
                    tapIndicator={isActive ? tapIndicator : null}
                    currentUserId={currentUserId}
                    onDoubleTapLike={handleDoubleTapLike}
                    onFeedTap={handleFeedTap}
                    onSeekReady={isActive ? handleSeekReady : undefined}
                    onRemoveVideo={handleRemoveVideo}
                    onToggleLike={toggleLike}
                    onToggleSave={handleToggleSave}
                    onToggleShare={handleSharePress}
                    onToggleFollow={toggleFollow}
                    onOpenShopping={handleOpenShopping}
                    onOpenDescription={handleOpenDescription}
                    onLongPress={handleLongPress}
                    onPressOut={handlePressOut}
                    onPressIn={handlePressIn}
                    onActionPressIn={handleActionButtonsPressIn}
                    onActionPressOut={handleActionButtonsPressOut}
                    onVideoEnd={handleVideoEnd}
                    onProgressUpdate={handleProgressUpdate}
                    onCarouselTouchStart={handleCarouselTouchStart}
                    onCarouselTouchEnd={handleCarouselTouchEnd}
                />
            );
        },
        [
            activeVideoId,
            activeIndex,
            isMuted,
            isSeeking,
            currentUserId,
            isCleanScreen,
            tapIndicator,
            handlePressIn,
            handlePressOut,
            handleActionButtonsPressIn,
            handleActionButtonsPressOut,
            handleVideoEnd,
            handleLongPress,
            handleProgressUpdate,
            handleFeedTap,
            handleOpenDescription,
            handleOpenShopping,
            handleRemoveVideo,
            handleCarouselTouchStart,
            handleCarouselTouchEnd,
            handleSeekReady,
            handleToggleSave,
            handleSharePress,
            toggleFollow,
            toggleLike,
        ]
    );

    const keyExtractor = useCallback((item: Video) => item.id, []);

    // Loading State
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
                <Text style={styles.retryText} onPress={refreshFeed}>Tekrar Dene</Text>
            </View>
        );
    }

    if (!isLoading && videos.length === 0) {
        return (
            <View style={styles.container}>
                <ScrollView
                    contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={refreshFeed}
                            tintColor="#FFFFFF"
                        />
                    }
                >
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Henüz video yok</Text>
                        <Text style={[styles.emptySubtext, { marginTop: 10 }]}>İlk videoyu sen yükle! 🚀</Text>
                    </View>
                </ScrollView>

                {!isCleanScreen && (
                    <Animated.View
                        style={[StyleSheet.absoluteFill, { zIndex: 50 }]}
                        pointerEvents="box-none"
                    >
                        <HeaderOverlay
                            isMuted={isMuted}
                            onToggleMute={handleToggleMute}
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

    const renderFooter = () => {
        if (!isLoadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#FFF" />
            </View>
        );
    };

    return (
        <SwipeWrapper
            onSwipeLeft={() => !isCustomFeed && router.push('/explore')}
            onSwipeRight={() => !isCustomFeed && router.push('/upload')}
            disabled={isCustomFeed}
        >
            <View style={styles.container}>
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
                            <Text style={[
                                styles.saveToastText,
                                styles.saveToastTextActive,
                            ]}>
                                {saveToastMessage}
                            </Text>
                        </View>
                    </RNAnimated.View>
                )}
                <FlashList
                    // @ts-ignore
                    ref={listRef}
                    data={videos}
                    renderItem={renderItem}
                    estimatedItemSize={ITEM_HEIGHT}
                    keyExtractor={keyExtractor}
                    pagingEnabled
                    decelerationRate="fast"
                    snapToInterval={ITEM_HEIGHT}
                    snapToAlignment="start"
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
                    removeClippedSubviews={true}  // Enable clipping for better performance
                    maxToRenderPerBatch={1}
                    windowSize={3}  // Only render 3 items: prev + current + next
                    initialNumToRender={1}  // Only render first video on mount
                    bounces={false}
                    overScrollMode="never"
                    scrollEnabled={!isCarouselInteracting}
                    nestedScrollEnabled={true}
                    onScrollBeginDrag={() => {
                        isScrollingSV.value = true;
                        setActiveTab('foryou');
                        setCleanScreen(false);
                        markStartupComplete();
                    }}
                    onScrollEndDrag={() => { isScrollingSV.value = false; }}
                    onMomentumScrollEnd={(e) => {
                        isScrollingSV.value = false;
                        handleScrollEnd(e);
                    }}
                />

                {!isCleanScreen && (
                    <Animated.View
                        style={[StyleSheet.absoluteFill, { zIndex: 50 }, uiOpacityStyle]}
                        pointerEvents={isSeeking ? 'none' : 'box-none'}
                    >
                        <HeaderOverlay
                            isMuted={isMuted}
                            onToggleMute={handleToggleMute}
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

                {!isCleanScreen && showStories && (
                    <StoryBar
                        isVisible={activeTab === 'stories'}
                        storyUsers={storyUsers}
                        onAvatarPress={handleStoryAvatarPress}
                        onClose={handleCloseStoryBar}
                    />
                )}

                {!isCleanScreen && activeTab === 'stories' && (
                    <Pressable
                        style={styles.touchInterceptor}
                        onPress={handleCloseStoryBar}
                    />
                )}

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

                <DeleteConfirmationModal
                    visible={isDeleteModalVisible}
                    onCancel={() => setDeleteModalVisible(false)}
                    onConfirm={() => {
                        if (activeVideoId) {
                            deleteVideo(activeVideoId);
                        }
                        setDeleteModalVisible(false);
                    }}
                />

            </View>
        </SwipeWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: { flex: 1, backgroundColor: COLORS.videoBackground },
    errorContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: 'red', marginBottom: 16 },
    retryText: { color: '#FFF', textDecorationLine: 'underline' },
    emptyContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#FFF' },
    emptySubtext: { color: '#aaa' },
    footerLoader: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent'
    },
    touchInterceptor: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
        backgroundColor: 'transparent',
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
        shadowColor: '#000',
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
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
});
