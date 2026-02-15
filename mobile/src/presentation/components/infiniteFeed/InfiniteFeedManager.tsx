import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    Pressable,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
    unstable_batchedUpdates,
    type NativeSyntheticEvent,
    type NativeScrollEvent,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { SystemBars } from 'react-native-edge-to-edge';
import { Image as ExpoImage } from 'expo-image';
import { useNetInfo, NetInfoStateType } from '@react-native-community/netinfo';
import {
    useInfiniteFeedActiveVideoStore,
    useInfiniteFeedMuteControls,
    useInfiniteFeedAuthStore,
} from './hooks/useInfiniteFeedStores';
import BottomSheet from '@gorhom/bottom-sheet';
import { useThemeStore } from '../../store/useThemeStore';
import { DARK_COLORS, LIGHT_COLORS } from '../../../core/constants';
import { getVideoUrl } from '../../../core/utils/videoUrl';
import type { InfiniteFeedVideo } from './InfiniteFeedVideoTypes';
import { InfiniteFeedHeader, FeedTab } from './InfiniteFeedHeader';
import { InfiniteFeedCard } from './InfiniteFeedCard';
import { InfiniteFeedMoreOptionsSheet } from './InfiniteFeedMoreOptionsSheet';
import { InfiniteFeedDeleteConfirmationModal } from './InfiniteFeedDeleteConfirmationModal';
import { styles } from './InfiniteFeedManager.styles';
import { FEED_FLAGS, FEED_CONFIG } from './hooks/useInfiniteFeedConfig';
import { useStories } from '../../hooks/useStories';
import { useVideoViewTracking } from '../../hooks/useVideoViewTracking';
import type { ViewToken } from 'react-native';
import { FeedPrefetchService } from '../../../data/services/FeedPrefetchService';
import { VideoCacheService } from '../../../data/services/VideoCacheService';
import { useInAppBrowserStore } from '../../store/useInAppBrowserStore';
import { PerformanceLogger } from '../../../core/services/PerformanceLogger';
import { useUploadStore } from '../../store/useUploadStore';
import { supabase } from '../../../core/supabase';

interface InfiniteFeedManagerProps {
    videos: InfiniteFeedVideo[];
    isLoading: boolean;
    isRefreshing: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    error: string | null;
    refreshFeed: () => void;
    loadMore: () => void;
    toggleLike: (id: string) => void;
    toggleSave: (id: string) => void;
    toggleFollow: (id: string) => void;
    toggleShare: (id: string) => void;
    toggleShop: (id: string) => void;
    deleteVideo: (id: string) => void | Promise<void>;
    prependVideo?: (video: InfiniteFeedVideo) => void;
    homeReselectTrigger?: number;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ESTIMATED_CARD_HEIGHT = Math.round(SCREEN_HEIGHT * 0.82);
const THUMBNAIL_PREFETCH_OFFSETS = [-2, -1, 1, 2, 3];
const FlashListAny = FlashList as any;
const INFINITE_WINDOW_SIZE = 5;
const INFINITE_MAX_RENDER_BATCH = 2;
const INFINITE_DRAW_DISTANCE = ESTIMATED_CARD_HEIGHT * 2;
const INFINITE_MINIMUM_VIEW_TIME_MS = 0;

const getPrefetchIndices = (activeIndex: number, videosLength: number): number[] => {
    const indices = new Set<number>();
    const ahead = FEED_CONFIG.PREFETCH_AHEAD_COUNT;
    const behind = FEED_CONFIG.PREFETCH_BEHIND_COUNT;
    const maxIndex = videosLength - 1;

    for (let i = 1; i <= ahead; i += 1) {
        const idx = activeIndex + i;
        if (idx <= maxIndex) indices.add(idx);
    }
    for (let i = 1; i <= behind; i += 1) {
        const idx = activeIndex - i;
        if (idx >= 0) indices.add(idx);
    }

    return Array.from(indices);
};


export function InfiniteFeedManager({
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
    homeReselectTrigger = 0,
}: InfiniteFeedManagerProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const navigation = useNavigation<any>();
    const isRouteFocused = useIsFocused();
    const netInfo = useNetInfo();
    const isDark = useThemeStore((state) => state.isDark);
    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const { isMuted, toggleMute } = useInfiniteFeedMuteControls();
    const currentUserId = useInfiniteFeedAuthStore((state) => state.user?.id);
    const { stories: storyListData } = useStories(undefined, 'infinite');
    const isInAppBrowserVisible = useInAppBrowserStore((state) => state.isVisible);
    const openInAppBrowser = useInAppBrowserStore((state) => state.openUrl);
    const uploadStatus = useUploadStore((state) => state.status);
    const uploadedVideoId = useUploadStore((state) => state.uploadedVideoId);
    const resetUpload = useUploadStore((state) => state.reset);
    const globalIsPaused = useInfiniteFeedActiveVideoStore((state) => state.isPaused);
    const isScreenFocused = useInfiniteFeedActiveVideoStore((state) => state.isScreenFocused);

    const [activeTab, setActiveTab] = useState<FeedTab>('Sana Özel');
    const [selectedMoreVideoId, setSelectedMoreVideoId] = useState<string | null>(null);
    const [isMoreDeleteConfirmationVisible, setMoreDeleteConfirmationVisible] = useState(false);
    const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

    // ✅ [PERF] Batched state - 4 states → 1 (reduces 4 re-renders to 1)
    interface FeedActiveState {
        activeId: string | null;
        pendingId: string | null;
        activeIndex: number;
        pendingIndex: number;
    }
    const [feedActiveState, setFeedActiveState] = useState<FeedActiveState>({
        activeId: null,
        pendingId: null,
        activeIndex: 0,
        pendingIndex: 0,
    });
    // Destructure for backward compatibility
    const { activeId: activeInlineId, pendingId: pendingInlineId, activeIndex: activeInlineIndex, pendingIndex: pendingInlineIndex } = feedActiveState;

    const trackedActiveVideo = useMemo(() => {
        if (!activeInlineId) return null;
        return videos.find((video) => video.id === activeInlineId) ?? null;
    }, [activeInlineId, videos]);

    const isViewTrackingEnabled = Boolean(
        trackedActiveVideo?.id &&
        currentUserId &&
        !isInAppBrowserVisible &&
        !globalIsPaused &&
        isScreenFocused &&
        isRouteFocused
    );

    useVideoViewTracking({
        videoId: trackedActiveVideo?.id,
        userId: currentUserId,
        enabled: isViewTrackingEnabled,
    });

    const [isCarouselInteracting, setIsCarouselInteracting] = useState(false);
    const [isFeedScrolling, setIsFeedScrolling] = useState(false);
    const isFeedScrollingRef = useRef(false);
    const [resolvedVideoSources, setResolvedVideoSources] = useState<Record<string, string>>({});
    const resolvedVideoSourcesRef = useRef<Record<string, string>>({});
    const activeInlineIdRef = useRef<string | null>(null);
    const activeInlineIndexRef = useRef<number>(0);
    const pendingActiveIdRef = useRef<string | null>(null);
    const pendingActiveIndexRef = useRef<number>(0);
    const momentumStartedRef = useRef(false);
    const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scrollStartAtRef = useRef<number | null>(null);
    const sourceResolveGenerationRef = useRef(0);
    const scrollDirectionRef = useRef<'up' | 'down'>('down');
    const lastScrollOffsetYRef = useRef(0);
    const listRef = useRef<any>(null);
    const moreOptionsSheetRef = useRef<BottomSheet>(null);
    const lastHandledReselectRef = useRef(0);

    // ✅ [PERF] Refs for renderItem volatile values - prevents renderItem recreation
    const themeColorsRef = useRef(themeColors);
    const currentUserIdRef = useRef(currentUserId);
    const isMutedRef = useRef(isMuted);
    const netInfoTypeRef = useRef(netInfo.type);

    const setActiveVideo = useInfiniteFeedActiveVideoStore((state) => state.setActiveVideo);
    const setPendingOpenVideo = useInfiniteFeedActiveVideoStore((state) => state.setPendingOpenVideo);
    const setPaused = useInfiniteFeedActiveVideoStore((state) => state.setPaused);
    const setScreenFocused = useInfiniteFeedActiveVideoStore((state) => state.setScreenFocused);
    const openVideoLockRef = useRef<{ id: string; ts: number } | null>(null);
    const immediateActiveCommit = FEED_FLAGS.INF_ACTIVE_COMMIT_ON_VIEWABLE;

    useFocusEffect(
        useCallback(() => {
            SystemBars.setStyle({
                statusBar: isDark ? 'light' : 'dark',
                navigationBar: isDark ? 'light' : 'dark',
            });
            SystemBars.setHidden({ statusBar: false, navigationBar: false });
        }, [isDark])
    );

    const handleOpenVideo = useCallback((id: string, index: number) => {
        const now = Date.now();
        const lock = openVideoLockRef.current;
        if (lock && lock.id === id && now - lock.ts < 400) return;
        openVideoLockRef.current = { id, ts: now };

        const selectedVideo = videos[index] ?? videos.find((video) => video.id === id) ?? null;
        unstable_batchedUpdates(() => {
            setPendingOpenVideo(selectedVideo);
            setActiveVideo(id, index);
            setScreenFocused(true);
            setPaused(false);
        });
        const parentNav = navigation.getParent?.();
        if (parentNav && typeof parentNav.jumpTo === 'function') {
            parentNav.jumpTo('videos');
            return;
        }
        router.navigate('/videos' as any);
    }, [videos, setPendingOpenVideo, setActiveVideo, setScreenFocused, setPaused, navigation, router]);

    const handleOpenVideosTab = useCallback(() => {
        const parentNav = navigation.getParent?.();
        if (parentNav && typeof parentNav.jumpTo === 'function') {
            parentNav.jumpTo('videos');
            return;
        }
        router.navigate('/videos' as any);
    }, [navigation, router]);

    const handleOpenProfile = useCallback((userId: string) => {
        if (!userId) return;
        const isSelfProfile = !!currentUserId && userId === currentUserId;
        const profileRoute = isSelfProfile ? '/profile' : `/user/${userId}`;
        router.push(profileRoute as any);
    }, [currentUserId, router]);

    const handleStoryAvatarPress = useCallback((userId: string) => {
        // StoryBar already gates presses with hasStory; avoid a second guard here
        // because it can become stale and block valid story navigation.
        router.push(`/story/${userId}` as any);
    }, [router]);

    const handleOpenShopping = useCallback((videoId: string) => {
        const selectedVideo = videos.find((video) => video.id === videoId);
        const brandUrl = selectedVideo?.brandUrl?.trim();

        if (!brandUrl) {
            Alert.alert('Link bulunamadı', 'Bu video için bir alışveriş linki yok.');
            return;
        }

        const normalizedUrl = /^https?:\/\//i.test(brandUrl)
            ? brandUrl
            : `https://${brandUrl}`;

        toggleShop(videoId);
        openInAppBrowser(normalizedUrl);
    }, [openInAppBrowser, toggleShop, videos]);

    const handleOpenMoreOptions = useCallback((videoId: string) => {
        const selectedVideo = videos.find((video) => video.id === videoId);
        if (!selectedVideo) return;

        setSelectedMoreVideoId(videoId);
        setIsMoreSheetOpen(true);
        moreOptionsSheetRef.current?.snapToIndex(0);
    }, [videos]);

    const handleMoreSheetDelete = useCallback(() => {
        const selectedVideo = videos.find((video) => video.id === selectedMoreVideoId);
        const isOwnVideo = !!currentUserId && selectedVideo?.user?.id === currentUserId;
        if (!isOwnVideo) return;

        moreOptionsSheetRef.current?.close();
        setMoreDeleteConfirmationVisible(true);
    }, [currentUserId, selectedMoreVideoId, videos]);

    const handleMoreSheetEdit = useCallback(() => {
        const targetId = selectedMoreVideoId;
        if (!targetId) return;

        const selectedVideo = videos.find((video) => video.id === targetId);
        const isOwnVideo = !!currentUserId && selectedVideo?.user?.id === currentUserId;
        if (!isOwnVideo) return;

        moreOptionsSheetRef.current?.close();
        router.push(`/edit?videoId=${encodeURIComponent(targetId)}` as any);
    }, [currentUserId, router, selectedMoreVideoId, videos]);

    const handleCancelMoreDelete = useCallback(() => {
        setMoreDeleteConfirmationVisible(false);
    }, []);

    const handleConfirmMoreDelete = useCallback(() => {
        const targetId = selectedMoreVideoId;
        if (targetId) {
            void deleteVideo(targetId);
        }
        setMoreDeleteConfirmationVisible(false);
        setSelectedMoreVideoId(null);
    }, [deleteVideo, selectedMoreVideoId]);

    const isOwnMoreOptionsVideo = useMemo(() => {
        if (!selectedMoreVideoId || !currentUserId) return false;
        const selectedVideo = videos.find((video) => video.id === selectedMoreVideoId);
        return selectedVideo?.user?.id === currentUserId;
    }, [currentUserId, selectedMoreVideoId, videos]);

    const storyUsers = useMemo(() => {
        return storyListData.reduce((acc: any[], story) => {
            if (!acc.find((u) => u.id === story.user.id)) {
                acc.push({ ...story.user, hasUnseenStory: !story.isViewed });
            } else if (!story.isViewed) {
                const user = acc.find((u) => u.id === story.user.id);
                if (user) user.hasUnseenStory = true;
            }
            return acc;
        }, []);
    }, [storyListData]);
    const activeStoryUserIds = useMemo(
        () => new Set<string>(storyUsers.map((user: any) => user.id).filter(Boolean)),
        [storyUsers]
    );

    const setResolvedSourceForId = useCallback((videoId: string, source: string | null) => {
        setResolvedVideoSources((prev) => {
            if (!source) {
                if (!(videoId in prev)) return prev;
                const next = { ...prev };
                delete next[videoId];
                return next;
            }
            if (prev[videoId] === source) return prev;
            return { ...prev, [videoId]: source };
        });
    }, []);

    // Sync ref inline so renderItem always reads the latest resolved sources
    // without needing resolvedVideoSources in its dependency array.
    resolvedVideoSourcesRef.current = resolvedVideoSources;

    const clearSettleTimer = useCallback(() => {
        if (!settleTimerRef.current) return;
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
    }, []);

    const activateTopVideo = useCallback((videoId: string) => {
        clearSettleTimer();
        momentumStartedRef.current = false;
        isFeedScrollingRef.current = false;
        setIsFeedScrolling(false);
        scrollStartAtRef.current = null;
        scrollDirectionRef.current = 'down';
        lastScrollOffsetYRef.current = 0;
        activeInlineIdRef.current = videoId;
        activeInlineIndexRef.current = 0;
        pendingActiveIdRef.current = videoId;
        pendingActiveIndexRef.current = 0;
        setFeedActiveState({
            activeId: videoId,
            pendingId: immediateActiveCommit ? null : videoId,
            activeIndex: 0,
            pendingIndex: immediateActiveCommit ? 0 : 0,
        });
        setActiveVideo(videoId, 0);
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
        requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
        });
    }, [clearSettleTimer, immediateActiveCommit, setActiveVideo]);

    useEffect(() => {
        if (!uploadedVideoId || uploadStatus !== 'success' || !prependVideo) return;

        let cancelled = false;

        const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        const fetchUploadedVideo = async () => {
            for (let attempt = 0; attempt < 5; attempt += 1) {
                const { data, error } = await supabase
                    .from('videos')
                    .select('*, profiles:user_id(*)')
                    .eq('id', uploadedVideoId)
                    .single();

                if (data && !error) {
                    return data as any;
                }

                if (attempt < 4) {
                    await wait(120);
                }
            }

            return null;
        };

        const handleUploadSuccess = async () => {
            const videoData = await fetchUploadedVideo();
            if (cancelled) return;

            if (!videoData) {
                await refreshFeed();
                if (!cancelled) {
                    activateTopVideo(uploadedVideoId);
                    resetUpload();
                }
                return;
            }

            const profileData = Array.isArray(videoData.profiles) ? videoData.profiles[0] : videoData.profiles;

            const uploadedVideo: InfiniteFeedVideo = {
                id: videoData.id,
                videoUrl: videoData.video_url,
                thumbnailUrl: videoData.thumbnail_url,
                description: videoData.description || '',
                likesCount: videoData.likes_count || 0,
                viewsCount: videoData.views_count || 0,
                commentsCount: 0,
                sharesCount: videoData.shares_count || 0,
                shopsCount: videoData.shops_count || 0,
                spriteUrl: videoData.sprite_url,
                isLiked: false,
                isSaved: false,
                savesCount: videoData.saves_count || 0,
                user: {
                    id: profileData?.id || videoData.user_id,
                    username: profileData?.username || 'unknown',
                    fullName: profileData?.full_name || '',
                    avatarUrl: profileData?.avatar_url || '',
                    country: profileData?.country,
                    age: profileData?.age,
                    bio: profileData?.bio,
                    website: profileData?.website,
                    isVerified: profileData?.is_verified,
                    shopEnabled: profileData?.shop_enabled,
                    followersCount: profileData?.followers_count,
                    followingCount: profileData?.following_count,
                    postsCount: profileData?.posts_count,
                    isFollowing: false,
                    instagramUrl: profileData?.instagram_url,
                    tiktokUrl: profileData?.tiktok_url,
                    youtubeUrl: profileData?.youtube_url,
                    xUrl: profileData?.x_url,
                },
                musicName: videoData.music_name || 'Original Audio',
                musicAuthor: videoData.music_author || 'WizyClub',
                width: videoData.width,
                height: videoData.height,
                isCommercial: videoData.is_commercial,
                brandName: videoData.brand_name,
                brandUrl: videoData.brand_url,
                commercialType: videoData.commercial_type,
                mediaUrls: videoData.media_urls,
                postType: videoData.post_type,
                createdAt: videoData.created_at,
            };

            prependVideo(uploadedVideo);
            activateTopVideo(uploadedVideoId);
            resetUpload();
        };

        void handleUploadSuccess();

        return () => {
            cancelled = true;
        };
    }, [
        activateTopVideo,
        prependVideo,
        refreshFeed,
        resetUpload,
        uploadedVideoId,
        uploadStatus,
    ]);

    const commitPendingActive = useCallback((reason: 'momentum-end' | 'drag-end-no-momentum' | 'viewable-immediate') => {
        if (!videos.length) return;

        const nextIndex = pendingActiveIndexRef.current;
        if (nextIndex < 0 || nextIndex >= videos.length) return;

        const nextId = pendingActiveIdRef.current;
        if (!nextId) return;
        const prevId = activeInlineIdRef.current;
        const prevIndex = activeInlineIndexRef.current;

        if (nextId === prevId && nextIndex === prevIndex) {
            scrollStartAtRef.current = null;
            return;
        }

        activeInlineIdRef.current = nextId;
        activeInlineIndexRef.current = nextIndex;
        // ✅ [PERF] Single batched state update instead of 4 separate calls
        setFeedActiveState({
            activeId: nextId,
            pendingId: immediateActiveCommit ? null : nextId,
            activeIndex: nextIndex,
            pendingIndex: immediateActiveCommit ? 0 : nextIndex,
        });
        scrollStartAtRef.current = null;
    }, [immediateActiveCommit, videos.length]);

    useEffect(() => {
        FeedPrefetchService.getInstance().setNetworkType((netInfo.type ?? null) as NetInfoStateType | null);
    }, [netInfo.type]);

    useEffect(() => {
        const ids = new Set(videos.map((video) => video.id));
        setResolvedVideoSources((prev) => {
            let changed = false;
            const next: Record<string, string> = {};
            Object.entries(prev).forEach(([videoId, source]) => {
                if (ids.has(videoId)) {
                    next[videoId] = source;
                } else {
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [videos]);

    useEffect(() => {
        if (!videos.length || activeInlineIndex < 0 || activeInlineIndex >= videos.length) {
            return;
        }

        const activeVideoId = videos[activeInlineIndex]?.id ?? null;
        const nextVideoId = videos[activeInlineIndex + 1]?.id ?? null;
        const keepIds = new Set<string>();
        if (activeVideoId) keepIds.add(activeVideoId);
        if (nextVideoId) keepIds.add(nextVideoId);

        setResolvedVideoSources((prev) => {
            let changed = false;
            const next: Record<string, string> = {};

            Object.entries(prev).forEach(([videoId, source]) => {
                if (keepIds.has(videoId)) {
                    next[videoId] = source;
                    return;
                }
                changed = true;
            });

            return changed ? next : prev;
        });
    }, [activeInlineIndex, videos]);

    useEffect(() => {
        if (videos.length === 0) {
            activeInlineIdRef.current = null;
            activeInlineIndexRef.current = 0;
            pendingActiveIdRef.current = null;
            pendingActiveIndexRef.current = 0;
            // ✅ [PERF] Single batched reset
            setFeedActiveState({
                activeId: null,
                pendingId: immediateActiveCommit ? null : null,
                activeIndex: 0,
                pendingIndex: immediateActiveCommit ? 0 : 0,
            });
            return;
        }

        const hasCurrentActive = Boolean(
            activeInlineIdRef.current && videos.some((video) => video.id === activeInlineIdRef.current)
        );
        if (hasCurrentActive) {
            pendingActiveIdRef.current = activeInlineIdRef.current;
            pendingActiveIndexRef.current = activeInlineIndexRef.current;
            if (!immediateActiveCommit) {
                // ✅ [PERF] Only update pending fields in batched call
                setFeedActiveState((prev) => ({
                    ...prev,
                    pendingId: activeInlineIdRef.current,
                    pendingIndex: activeInlineIndexRef.current,
                }));
            }
            return;
        }

        const firstVideoId = videos[0]?.id ?? null;
        activeInlineIdRef.current = firstVideoId;
        activeInlineIndexRef.current = 0;
        pendingActiveIdRef.current = firstVideoId;
        pendingActiveIndexRef.current = 0;
        // ✅ [PERF] Single batched init
        setFeedActiveState({
            activeId: firstVideoId,
            pendingId: immediateActiveCommit ? null : firstVideoId,
            activeIndex: 0,
            pendingIndex: immediateActiveCommit ? 0 : 0,
        });
    }, [immediateActiveCommit, videos]);

    useEffect(() => {
        pendingActiveIdRef.current = activeInlineId;
        pendingActiveIndexRef.current = activeInlineIndex;
        // Note: This effect syncs refs only when immediateActiveCommit is true.
        // When immediateActiveCommit is false, pending updates happen via setFeedActiveState.
    }, [activeInlineId, activeInlineIndex, immediateActiveCommit]);

    useEffect(() => () => {
        clearSettleTimer();
    }, [clearSettleTimer]);

    useEffect(() => {
        if (homeReselectTrigger <= 0) return;
        if (homeReselectTrigger === lastHandledReselectRef.current) return;
        lastHandledReselectRef.current = homeReselectTrigger;
        if (videos.length === 0) return;

        const firstVideoId = videos[0]?.id ?? null;
        clearSettleTimer();
        momentumStartedRef.current = false;
        isFeedScrollingRef.current = false;
        setIsFeedScrolling(false);
        scrollStartAtRef.current = null;
        scrollDirectionRef.current = 'down';
        lastScrollOffsetYRef.current = 0;
        activeInlineIdRef.current = firstVideoId;
        activeInlineIndexRef.current = 0;
        pendingActiveIdRef.current = firstVideoId;
        pendingActiveIndexRef.current = 0;
        setActiveTab('Sana Özel');
        // ✅ [PERF] Single batched update for home reselect
        setFeedActiveState({
            activeId: firstVideoId,
            pendingId: immediateActiveCommit ? null : firstVideoId,
            activeIndex: 0,
            pendingIndex: immediateActiveCommit ? 0 : 0,
        });
        if (firstVideoId) {
            setActiveVideo(firstVideoId, 0);
        }

        requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
    }, [homeReselectTrigger, immediateActiveCommit, videos, clearSettleTimer, setActiveVideo]);

    useEffect(() => {
        if (!videos.length || activeInlineIndex < 0 || activeInlineIndex >= videos.length) return;

        if (isFeedScrolling) {
            const nextVideo = videos[activeInlineIndex + 1];
            if (nextVideo?.thumbnailUrl) {
                ExpoImage.prefetch(nextVideo.thumbnailUrl);
            }
            return;
        }

        const prefetchService = FeedPrefetchService.getInstance();
        const activeVideo = videos[activeInlineIndex];
        const activeVideoUrl = activeVideo && activeVideo.postType !== 'carousel'
            ? getVideoUrl(activeVideo)
            : null;

        if (activeVideoUrl) {
            prefetchService.bumpPriority(activeVideoUrl, 0);
            prefetchService.queueSingleVideo(activeVideoUrl, 0);
            VideoCacheService.warmupCache(activeVideoUrl);

            const generation = ++sourceResolveGenerationRef.current;
            const resolveIfCurrent = (cachedPath: string | null) => {
                if (sourceResolveGenerationRef.current !== generation) return;
                if (!cachedPath) return;
                setResolvedSourceForId(activeVideo.id, cachedPath);
            };
            const memoryCached = VideoCacheService.getMemoryCachedPath(activeVideoUrl);
            if (memoryCached) {
                setResolvedSourceForId(activeVideo.id, memoryCached);
            } else {
                const previousResolved = resolvedVideoSourcesRef.current[activeVideo.id] ?? null;
                const hasResolvedFallback = Boolean(previousResolved);
                prefetchService.cacheVideoNow(activeVideoUrl)
                    .then((cachedPath) => {
                        if (cachedPath) {
                            resolveIfCurrent(cachedPath);
                            return;
                        }
                        return prefetchService.getCachedPath(activeVideoUrl).then((resolvedPath) => {
                            if (resolvedPath) {
                                resolveIfCurrent(resolvedPath);
                                return;
                            }
                            if (!hasResolvedFallback) {
                                setResolvedSourceForId(activeVideo.id, null);
                            }
                        });
                    })
                    .catch(() => {
                        if (!hasResolvedFallback) {
                            setResolvedSourceForId(activeVideo.id, null);
                        }
                    });
            }
        }

        THUMBNAIL_PREFETCH_OFFSETS.forEach((offset) => {
            const video = videos[activeInlineIndex + offset];
            if (!video?.thumbnailUrl) return;
            ExpoImage.prefetch(video.thumbnailUrl);
        });

        const prefetchIndices = getPrefetchIndices(activeInlineIndex, videos.length).filter((idx) => {
            const video = videos[idx];
            return Boolean(video && video.postType !== 'carousel' && getVideoUrl(video));
        });
        if (prefetchIndices.length > 0) {
            prefetchService.queueVideos(videos, prefetchIndices, activeInlineIndex);
        }
        const nextPlayableIndex = activeInlineIndex + 1;
        const nextResolvedCandidateIndex = prefetchIndices.find((idx) => idx > activeInlineIndex) ?? null;
        prefetchIndices.forEach((idx) => {
            const neighborVideo = videos[idx];
            if (!neighborVideo) return;

            const url = getVideoUrl(neighborVideo);
            if (!url) return;

            VideoCacheService.warmupCache(url);
            const shouldPublishResolvedSource = idx === nextResolvedCandidateIndex;

            const memoryCached = VideoCacheService.getMemoryCachedPath(url);
            if (memoryCached) {
                if (shouldPublishResolvedSource) {
                    setResolvedSourceForId(neighborVideo.id, memoryCached);
                }
                return;
            }

            const hasResolvedSource = Boolean(resolvedVideoSourcesRef.current[neighborVideo.id]);
            const shouldForceImmediateCache = idx === nextPlayableIndex && !hasResolvedSource;
            const resolvePromise = shouldForceImmediateCache
                ? prefetchService.cacheVideoNow(url).then((cachedPath) => cachedPath ?? prefetchService.getCachedPath(url))
                : prefetchService.getCachedPath(url);

            resolvePromise
                .then((cachedPath) => {
                    if (!cachedPath || !shouldPublishResolvedSource) return;
                    setResolvedSourceForId(neighborVideo.id, cachedPath);
                })
                .catch(() => {
                    // best effort: nearby cache resolve failures should not block playback
                });
        });
    }, [activeInlineIndex, isFeedScrolling, videos, setResolvedSourceForId]);


    const handleCarouselTouchStart = useCallback(() => {
        setIsCarouselInteracting((prev) => (prev ? prev : true));
    }, []);

    const handleCarouselTouchEnd = useCallback(() => {
        setIsCarouselInteracting((prev) => (prev ? false : prev));
    }, []);

    const cardActionHandlersRef = useRef({
        onToggleMute: toggleMute,
        onOpen: handleOpenVideo,
        onOpenProfile: handleOpenProfile,
        onMore: handleOpenMoreOptions,
        onLike: toggleLike,
        onSave: toggleSave,
        onFollow: toggleFollow,
        onShare: toggleShare,
        onShop: handleOpenShopping,
        onWatchMoreClips: handleOpenVideosTab,
        onCarouselTouchStart: handleCarouselTouchStart,
        onCarouselTouchEnd: handleCarouselTouchEnd,
    });

    useEffect(() => {
        cardActionHandlersRef.current = {
            onToggleMute: toggleMute,
            onOpen: handleOpenVideo,
            onOpenProfile: handleOpenProfile,
            onMore: handleOpenMoreOptions,
            onLike: toggleLike,
            onSave: toggleSave,
            onFollow: toggleFollow,
            onShare: toggleShare,
            onShop: handleOpenShopping,
            onWatchMoreClips: handleOpenVideosTab,
            onCarouselTouchStart: handleCarouselTouchStart,
            onCarouselTouchEnd: handleCarouselTouchEnd,
        };
    }, [
        toggleMute,
        handleOpenVideo,
        handleOpenProfile,
        handleOpenMoreOptions,
        toggleLike,
        toggleSave,
        toggleFollow,
        toggleShare,
        handleOpenShopping,
        handleOpenVideosTab,
        handleCarouselTouchStart,
        handleCarouselTouchEnd,
    ]);

    // ✅ [PERF] Sync volatile refs for renderItem (no re-render trigger)
    useEffect(() => {
        themeColorsRef.current = themeColors;
        currentUserIdRef.current = currentUserId;
        isMutedRef.current = isMuted;
        netInfoTypeRef.current = netInfo.type;
    });

    const effectivePendingInlineId = immediateActiveCommit ? activeInlineId : pendingInlineId;
    const effectivePendingInlineIndex = immediateActiveCommit ? activeInlineIndex : pendingInlineIndex;

    // ✅ [PERF] Optimized renderItem - uses refs for volatile values (8 deps → 3 deps)
    const renderItem = useCallback(({ item, index, target }: { item: InfiniteFeedVideo; index: number; target?: string }) => {
        const handlers = cardActionHandlersRef.current;
        const colors = themeColorsRef.current;
        const userId = currentUserIdRef.current;
        const muted = isMutedRef.current;
        const browserVisible = isInAppBrowserVisible;
        const pausedByLifecycle = globalIsPaused || !isScreenFocused || !isRouteFocused;
        const networkType = (netInfoTypeRef.current ?? null) as NetInfoStateType | null;

        const prewarmRange = FEED_CONFIG.DECODE_PREWARM_AHEAD_COUNT;
        const prewarmPlayRange = FEED_CONFIG.DECODE_PREWARM_PLAY_COUNT;
        const prewarmDistance = scrollDirectionRef.current === 'up'
            ? effectivePendingInlineIndex - index
            : index - effectivePendingInlineIndex;
        const isPendingWindow = scrollDirectionRef.current === 'up'
            ? (index <= effectivePendingInlineIndex && index >= effectivePendingInlineIndex - prewarmRange)
            : (index >= effectivePendingInlineIndex && index <= effectivePendingInlineIndex + prewarmRange);
        const allowDecodePrewarm = prewarmDistance >= 1 && prewarmDistance <= prewarmPlayRange;
        const hasActiveStory = Boolean(item.user?.id && activeStoryUserIds.has(item.user.id));

        return (
            <InfiniteFeedCard
                item={item}
                index={index}
                activeIndex={activeInlineIndexRef.current}
                colors={colors}
                isActive={item.id === activeInlineId}
                isPendingActive={item.id === effectivePendingInlineId || isPendingWindow}
                allowDecodePrewarm={allowDecodePrewarm}
                isMuted={muted}
                isPaused={browserVisible || pausedByLifecycle}
                currentUserId={userId}
                hasActiveStory={hasActiveStory}
                onToggleMute={handlers.onToggleMute}
                onOpen={handlers.onOpen}
                onOpenProfile={handlers.onOpenProfile}
                onMore={handlers.onMore}
                onLike={handlers.onLike}
                onSave={handlers.onSave}
                onFollow={handlers.onFollow}
                onShare={handlers.onShare}
                onShop={handlers.onShop}
                onWatchMoreClips={handlers.onWatchMoreClips}
                onCarouselTouchStart={handlers.onCarouselTouchStart}
                onCarouselTouchEnd={handlers.onCarouselTouchEnd}
                isMeasurement={target === 'Measurement'}
                resolvedVideoSource={resolvedVideoSourcesRef.current[item.id] ?? null}
                networkType={networkType}
            />
        );
    }, [activeInlineId, activeStoryUserIds, effectivePendingInlineId, effectivePendingInlineIndex, globalIsPaused, isInAppBrowserVisible, isRouteFocused, isScreenFocused]);

    // Active item changes when card visibility crosses threshold
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: FEED_CONFIG.PLAY_VISIBILITY_THRESHOLD_PERCENT,
        minimumViewTime: INFINITE_MINIMUM_VIEW_TIME_MS,
    }).current;

    const onViewableItemsChanged = useCallback(({
        viewableItems,
    }: {
        viewableItems: ViewToken<InfiniteFeedVideo>[];
    }) => {
        const visiblePlayableTokens = (viewableItems ?? []).filter((token) => {
            if (!token?.isViewable || !token.item || typeof token.index !== 'number') return false;
            return token.item.postType === 'carousel' || !!getVideoUrl(token.item);
        });

        if (visiblePlayableTokens.length === 0) return;

        const sortedVisible = [...visiblePlayableTokens].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        const currentActiveId = activeInlineIdRef.current;
        const currentActiveIndex = activeInlineIndexRef.current;

        let nextViewable = scrollDirectionRef.current === 'up'
            ? sortedVisible[0]
            : sortedVisible[sortedVisible.length - 1];

        if (currentActiveId) {
            if (scrollDirectionRef.current === 'up') {
                for (let i = sortedVisible.length - 1; i >= 0; i -= 1) {
                    const token = sortedVisible[i];
                    const tokenIndex = typeof token.index === 'number' ? token.index : null;
                    if (tokenIndex == null) continue;
                    if (tokenIndex < currentActiveIndex) {
                        nextViewable = token;
                        break;
                    }
                }
            } else {
                for (const token of sortedVisible) {
                    const tokenIndex = typeof token.index === 'number' ? token.index : null;
                    if (tokenIndex == null) continue;
                    if (tokenIndex > currentActiveIndex) {
                        nextViewable = token;
                        break;
                    }
                }
            }
        }

        const candidate = nextViewable?.item;
        const nextIndex = typeof nextViewable?.index === 'number' ? nextViewable.index : null;
        if (!candidate || !candidate.id || nextIndex == null) return;

        if (candidate.id === activeInlineIdRef.current && nextIndex === activeInlineIndexRef.current) return;
        if (candidate.id === pendingActiveIdRef.current && nextIndex === pendingActiveIndexRef.current) return;
        if (candidate.id !== activeInlineIdRef.current) {
            PerformanceLogger.startTransition(candidate.id);
        }
        pendingActiveIdRef.current = candidate.id;
        pendingActiveIndexRef.current = nextIndex;
        if (immediateActiveCommit) {
            commitPendingActive('viewable-immediate');
            return;
        }
        // ✅ [PERF] Batched pending update via single call
        setFeedActiveState((prev) => ({
            ...prev,
            pendingId: candidate.id,
            pendingIndex: nextIndex,
        }));
    }, [commitPendingActive, immediateActiveCommit]);

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetY = event.nativeEvent.contentOffset.y ?? 0;
        const diff = offsetY - lastScrollOffsetYRef.current;
        if (diff > 1) {
            scrollDirectionRef.current = 'down';
        } else if (diff < -1) {
            scrollDirectionRef.current = 'up';
        }
        lastScrollOffsetYRef.current = offsetY;
    }, []);

    const handleScrollBeginDrag = useCallback(() => {
        clearSettleTimer();
        momentumStartedRef.current = false;
        scrollStartAtRef.current = Date.now();
        if (!isFeedScrollingRef.current) {
            isFeedScrollingRef.current = true;
            setIsFeedScrolling(true);
        }
    }, [clearSettleTimer]);

    const handleMomentumScrollBegin = useCallback(() => {
        momentumStartedRef.current = true;
        if (!scrollStartAtRef.current) {
            scrollStartAtRef.current = Date.now();
        }
        if (!isFeedScrollingRef.current) {
            isFeedScrollingRef.current = true;
            setIsFeedScrolling(true);
        }
    }, []);

    const handleMomentumScrollEnd = useCallback(() => {
        clearSettleTimer();
        momentumStartedRef.current = false;
        isFeedScrollingRef.current = false;
        setIsFeedScrolling(false);
        commitPendingActive('momentum-end');
    }, [clearSettleTimer, commitPendingActive]);

    const handleScrollEndDrag = useCallback((_event: NativeSyntheticEvent<NativeScrollEvent>) => {
        clearSettleTimer();
        settleTimerRef.current = setTimeout(() => {
            if (momentumStartedRef.current) return;
            isFeedScrollingRef.current = false;
            setIsFeedScrolling(false);
            commitPendingActive('drag-end-no-momentum');
        }, 32);
    }, [clearSettleTimer, commitPendingActive]);

    // Only track the active video's resolved source so cache-resolve for
    // non-visible videos doesn't trigger a full list re-render.
    const activeResolvedSource = activeInlineId ? resolvedVideoSources[activeInlineId] : null;
    const playbackPauseGate = isInAppBrowserVisible || globalIsPaused || !isScreenFocused || !isRouteFocused;

    const flashListExtraData = useMemo(() => ({
        activeInlineId,
        pendingInlineId: effectivePendingInlineId,
        pendingInlineIndex: effectivePendingInlineIndex,
        isMuted,
        immediateActiveCommit,
        activeResolvedSource,
        playbackPauseGate,
    }), [activeInlineId, activeResolvedSource, effectivePendingInlineId, effectivePendingInlineIndex, immediateActiveCommit, isMuted, playbackPauseGate]);

    const listEmpty = (
        <View style={styles.emptyState}>
            {isLoading ? (
                <ActivityIndicator size="large" color={themeColors.textPrimary} />
            ) : (
                <>
                    <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>Akış boş görünüyor</Text>
                    <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                        {error || 'Yeni içerikler geldiğinde burada göreceksin.'}
                    </Text>
                    {error ? (
                        <Pressable
                            style={[styles.retryButton, { borderColor: themeColors.textPrimary }]}
                            onPress={refreshFeed}
                        >
                            <Text style={[styles.retryText, { color: themeColors.textPrimary }]}>Tekrar Dene</Text>
                        </Pressable>
                    ) : null}
                </>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <FlashListAny
                ref={listRef}
                data={videos}
                renderItem={renderItem}
                keyExtractor={(item: InfiniteFeedVideo) => item.id}
                extraData={flashListExtraData}
                viewabilityConfig={viewabilityConfig}
                onViewableItemsChanged={onViewableItemsChanged}
                onScrollBeginDrag={handleScrollBeginDrag}
                onScrollEndDrag={handleScrollEndDrag}
                onMomentumScrollBegin={handleMomentumScrollBegin}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                onScroll={handleScroll}
                scrollEventThrottle={32}
                estimatedItemSize={ESTIMATED_CARD_HEIGHT}
                removeClippedSubviews={true}
                maxToRenderPerBatch={INFINITE_MAX_RENDER_BATCH}
                windowSize={INFINITE_WINDOW_SIZE}
                drawDistance={INFINITE_DRAW_DISTANCE}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!isCarouselInteracting}
                ListHeaderComponent={!FEED_FLAGS.INF_DISABLE_HEADER_TABS ? (
                    <InfiniteFeedHeader
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        colors={themeColors}
                        insetTop={insets.top}
                        onUploadPress={() => router.push('/upload')}
                        onCreateStoryPress={() => router.push('/storyUpload')}
                        onNotificationPress={() => router.push('/notifications')}
                        storyUsers={storyUsers}
                        onStoryAvatarPress={handleStoryAvatarPress}
                    />
                ) : (
                    <View style={{ height: insets.top }} />
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={refreshFeed}
                        tintColor={themeColors.textPrimary}
                    />
                }
                onEndReached={hasMore ? loadMore : undefined}
                onEndReachedThreshold={0.6}
                ListFooterComponent={
                    isLoadingMore ? (
                        <ActivityIndicator style={styles.footerLoader} color={themeColors.textPrimary} />
                    ) : null
                }
                ListEmptyComponent={listEmpty}
                contentContainerStyle={{
                    paddingBottom: 0,
                }}
            />
            <View
                pointerEvents="none"
                style={[
                    styles.statusBarOverlay,
                    { height: insets.top, backgroundColor: themeColors.background },
                ]}
            />
            <View
                style={styles.sheetsContainer}
                pointerEvents={isMoreSheetOpen || isMoreDeleteConfirmationVisible ? 'box-none' : 'none'}
            >
                {isMoreSheetOpen && !isMoreDeleteConfirmationVisible ? (
                    <Pressable
                        style={styles.sheetDismissOverlay}
                        onPress={() => moreOptionsSheetRef.current?.close()}
                    />
                ) : null}
                <InfiniteFeedMoreOptionsSheet
                    ref={moreOptionsSheetRef}
                    onEditPress={isOwnMoreOptionsVideo ? handleMoreSheetEdit : undefined}
                    onDeletePress={isOwnMoreOptionsVideo ? handleMoreSheetDelete : undefined}
                    onSheetStateChange={setIsMoreSheetOpen}
                />
                <InfiniteFeedDeleteConfirmationModal
                    visible={isMoreDeleteConfirmationVisible}
                    onCancel={handleCancelMoreDelete}
                    onConfirm={handleConfirmMoreDelete}
                />
            </View>
        </View>
    );
}
