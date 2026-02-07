import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    Pressable,
    RefreshControl,
    ActivityIndicator,
    Dimensions,
    type NativeSyntheticEvent,
    type NativeScrollEvent,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { SystemBars } from 'react-native-edge-to-edge';
import { Image as ExpoImage } from 'expo-image';
import { useNetInfo, NetInfoStateType } from '@react-native-community/netinfo';
import {
    useInfiniteFeedActiveVideoStore,
    useInfiniteFeedMuteControls,
    useInfiniteFeedAuthStore,
} from './hooks/useInfiniteFeedStores';
import { useThemeStore } from '../../store/useThemeStore';
import { DARK_COLORS, LIGHT_COLORS } from '../../../core/constants';
import { getVideoUrl } from '../../../core/utils/videoUrl';
import type { InfiniteFeedVideo } from './InfiniteFeedVideoTypes';
import { InfiniteFeedHeader, FeedTab } from './InfiniteFeedHeader';
import { InfiniteFeedCard } from './InfiniteFeedCard';
import { styles } from './InfiniteFeedManager.styles';
import { FEED_FLAGS, FEED_CONFIG } from './hooks/useInfiniteFeedConfig';
import { useInfiniteStoryViewer } from '../../hooks/useInfiniteStoryViewer';
import type { ViewToken } from 'react-native';
import { FeedPrefetchService } from '../../../data/services/FeedPrefetchService';
import { VideoCacheService } from '../../../data/services/VideoCacheService';
import { LogCode, logCache, logPerf, logVideo } from '@/core/services/Logger';

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
    homeReselectTrigger?: number;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ESTIMATED_CARD_HEIGHT = Math.round(SCREEN_HEIGHT * 0.82);
const THUMBNAIL_PREFETCH_OFFSETS = [-2, -1, 1, 2, 3];
const FlashListAny = FlashList as any;
const INFINITE_WINDOW_SIZE = 5;
const INFINITE_MAX_RENDER_BATCH = 2;
const INFINITE_DRAW_DISTANCE = ESTIMATED_CARD_HEIGHT * 1.5;

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
    homeReselectTrigger = 0,
}: InfiniteFeedManagerProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const netInfo = useNetInfo();
    const isDark = useThemeStore((state) => state.isDark);
    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const { isMuted, toggleMute } = useInfiniteFeedMuteControls();
    const currentUserId = useInfiniteFeedAuthStore((state) => state.user?.id);
    const { stories: storyListData } = useInfiniteStoryViewer();

    const [activeTab, setActiveTab] = useState<FeedTab>('Sana Özel');
    const [activeInlineId, setActiveInlineId] = useState<string | null>(null);
    const [pendingInlineId, setPendingInlineId] = useState<string | null>(null);
    const [activeInlineIndex, setActiveInlineIndex] = useState<number>(0);
    const [pendingInlineIndex, setPendingInlineIndex] = useState<number>(0);
    const [isCarouselInteracting, setIsCarouselInteracting] = useState(false);
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
    const lastHandledReselectRef = useRef(0);

    const setCustomFeed = useInfiniteFeedActiveVideoStore((state) => state.setCustomFeed);
    const setActiveVideo = useInfiniteFeedActiveVideoStore((state) => state.setActiveVideo);
    const isPaused = useInfiniteFeedActiveVideoStore((state) => state.isPaused);
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
        setCustomFeed(videos);
        setActiveVideo(id, index);
        router.push('/custom-feed' as any);
    }, [videos, setCustomFeed, setActiveVideo, router]);

    const handleStoryAvatarPress = useCallback((userId: string) => {
        router.push(`/story/${userId}` as any);
    }, [router]);

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

    const commitPendingActive = useCallback((reason: 'momentum-end' | 'drag-end-no-momentum' | 'viewable-immediate') => {
        if (!videos.length) return;

        const nextIndex = pendingActiveIndexRef.current;
        if (nextIndex < 0 || nextIndex >= videos.length) return;

        const nextId = pendingActiveIdRef.current;
        const prevId = activeInlineIdRef.current;
        const prevIndex = activeInlineIndexRef.current;

        if (nextId === prevId && nextIndex === prevIndex) {
            scrollStartAtRef.current = null;
            return;
        }

        activeInlineIdRef.current = nextId;
        activeInlineIndexRef.current = nextIndex;
        setActiveInlineId(nextId);
        setPendingInlineId(nextId);
        setPendingInlineIndex(nextIndex);
        setActiveInlineIndex(nextIndex);

        const settleDurationMs = scrollStartAtRef.current ? Date.now() - scrollStartAtRef.current : null;
        scrollStartAtRef.current = null;

        logVideo(LogCode.VIDEO_PLAYBACK_START, 'Infinite feed active video committed on settle', {
            reason,
            previousIndex: prevIndex,
            nextIndex,
            nextId,
        });
        logPerf(LogCode.PERF_MEASURE_END, 'Infinite feed settle commit measured', {
            reason,
            settleDurationMs,
            queueLength: FeedPrefetchService.getInstance().getQueueLength(),
        });
    }, [videos.length]);

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
        if (videos.length === 0) {
            activeInlineIdRef.current = null;
            activeInlineIndexRef.current = 0;
            pendingActiveIdRef.current = null;
            pendingActiveIndexRef.current = 0;
            setActiveInlineId(null);
            setPendingInlineId(null);
            setPendingInlineIndex(0);
            setActiveInlineIndex(0);
            return;
        }

        const hasCurrentActive = Boolean(
            activeInlineIdRef.current && videos.some((video) => video.id === activeInlineIdRef.current)
        );
        if (hasCurrentActive) {
            pendingActiveIdRef.current = activeInlineIdRef.current;
            pendingActiveIndexRef.current = activeInlineIndexRef.current;
            setPendingInlineIndex(activeInlineIndexRef.current);
            return;
        }

        const firstVideoId = videos[0]?.id ?? null;
        activeInlineIdRef.current = firstVideoId;
        activeInlineIndexRef.current = 0;
        pendingActiveIdRef.current = firstVideoId;
        pendingActiveIndexRef.current = 0;
        setActiveInlineId(firstVideoId);
        setPendingInlineId(firstVideoId);
        setPendingInlineIndex(0);
        setActiveInlineIndex(0);
    }, [videos]);

    useEffect(() => {
        pendingActiveIdRef.current = activeInlineId;
        setPendingInlineId(activeInlineId);
        pendingActiveIndexRef.current = activeInlineIndex;
        setPendingInlineIndex(activeInlineIndex);
    }, [activeInlineId, activeInlineIndex]);

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
        scrollStartAtRef.current = null;
        scrollDirectionRef.current = 'down';
        lastScrollOffsetYRef.current = 0;
        activeInlineIdRef.current = firstVideoId;
        activeInlineIndexRef.current = 0;
        pendingActiveIdRef.current = firstVideoId;
        pendingActiveIndexRef.current = 0;
        setActiveTab('Sana Özel');
        setActiveInlineId(firstVideoId);
        setPendingInlineId(firstVideoId);
        setPendingInlineIndex(0);
        setActiveInlineIndex(0);
        if (firstVideoId) {
            setActiveVideo(firstVideoId, 0);
        }

        requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
    }, [homeReselectTrigger, videos, clearSettleTimer, setActiveVideo]);

    useEffect(() => {
        if (!videos.length || activeInlineIndex < 0 || activeInlineIndex >= videos.length) return;

        const prefetchService = FeedPrefetchService.getInstance();
        const activeVideo = videos[activeInlineIndex];
        const activeVideoUrl = activeVideo ? getVideoUrl(activeVideo) : null;

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
                logCache(LogCode.CACHE_HIT, 'Infinite active video served from memory cache', {
                    videoId: activeVideo.id,
                    index: activeInlineIndex,
                });
            } else {
                const previousResolved = resolvedVideoSourcesRef.current[activeVideo.id] ?? null;
                const hasResolvedFallback = Boolean(previousResolved);
                logCache(LogCode.CACHE_MISS, 'Infinite active video cache miss, forcing cache now', {
                    videoId: activeVideo.id,
                    index: activeInlineIndex,
                    hasResolvedFallback,
                });
                prefetchService.cacheVideoNow(activeVideoUrl)
                    .then((cachedPath) => {
                        if (cachedPath) {
                            resolveIfCurrent(cachedPath);
                            logCache(LogCode.CACHE_SET, 'Infinite active video cached immediately', {
                                videoId: activeVideo.id,
                                index: activeInlineIndex,
                            });
                            return;
                        }
                        return prefetchService.getCachedPath(activeVideoUrl).then((resolvedPath) => {
                            if (resolvedPath) {
                                logCache(LogCode.CACHE_HIT, 'Infinite active video resolved from disk cache', {
                                    videoId: activeVideo.id,
                                    index: activeInlineIndex,
                                });
                                resolveIfCurrent(resolvedPath);
                                return;
                            }
                            if (!hasResolvedFallback) {
                                setResolvedSourceForId(activeVideo.id, null);
                            }
                            logCache(LogCode.CACHE_MISS, 'Infinite active video still not cached after force-cache', {
                                videoId: activeVideo.id,
                                index: activeInlineIndex,
                                hasResolvedFallback,
                            });
                        });
                    })
                    .catch((error) => {
                        if (!hasResolvedFallback) {
                            setResolvedSourceForId(activeVideo.id, null);
                        }
                        logCache(LogCode.CACHE_ERROR, 'Infinite active video force-cache failed', {
                            videoId: activeVideo.id,
                            index: activeInlineIndex,
                            hasResolvedFallback,
                            error,
                        });
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
            logPerf(LogCode.PREFETCH_START, 'Infinite feed queued nearby videos for prefetch', {
                activeInlineIndex,
                prefetchIndices,
            });
        }
        const nextPlayableIndex = activeInlineIndex + 1;
        prefetchIndices.forEach((idx) => {
            const neighborVideo = videos[idx];
            if (!neighborVideo) return;

            const url = getVideoUrl(neighborVideo);
            if (!url) return;

            VideoCacheService.warmupCache(url);

            const memoryCached = VideoCacheService.getMemoryCachedPath(url);
            if (memoryCached) {
                setResolvedSourceForId(neighborVideo.id, memoryCached);
                return;
            }

            const hasResolvedSource = Boolean(resolvedVideoSourcesRef.current[neighborVideo.id]);
            const shouldForceImmediateCache = idx === nextPlayableIndex && !hasResolvedSource;
            const resolvePromise = shouldForceImmediateCache
                ? prefetchService.cacheVideoNow(url).then((cachedPath) => cachedPath ?? prefetchService.getCachedPath(url))
                : prefetchService.getCachedPath(url);

            resolvePromise
                .then((cachedPath) => {
                    if (!cachedPath) return;
                    setResolvedSourceForId(neighborVideo.id, cachedPath);
                })
                .catch(() => {
                    // best effort: nearby cache resolve failures should not block playback
                });
        });
    }, [activeInlineIndex, videos, setResolvedSourceForId]);


    const handleCarouselTouchStart = useCallback(() => {
        setIsCarouselInteracting((prev) => (prev ? prev : true));
    }, []);

    const handleCarouselTouchEnd = useCallback(() => {
        setIsCarouselInteracting((prev) => (prev ? false : prev));
    }, []);

    // Ref-based: no state update → no re-render on scroll start/end.
    // With immediateActiveCommit=true this is always false.
    const shouldPauseForScroll = isFeedScrollingRef.current && !immediateActiveCommit;

    const renderItem = useCallback(({ item, index, target }: { item: InfiniteFeedVideo; index: number; target?: string }) => {
        // Decode pre-warm: keep current + next N items mounted (paused),
        // then start playback only when the candidate crosses visibility threshold.
        const prewarmRange = FEED_CONFIG.DECODE_PREWARM_AHEAD_COUNT;
        const prewarmPlayRange = FEED_CONFIG.DECODE_PREWARM_PLAY_COUNT;
        const prewarmDistance = scrollDirectionRef.current === 'up'
            ? pendingInlineIndex - index
            : index - pendingInlineIndex;
        const isPendingWindow = scrollDirectionRef.current === 'up'
            ? (index <= pendingInlineIndex && index >= pendingInlineIndex - prewarmRange)
            : (index >= pendingInlineIndex && index <= pendingInlineIndex + prewarmRange);
        const allowDecodePrewarm = prewarmDistance >= 1 && prewarmDistance <= prewarmPlayRange;

        return (
            <InfiniteFeedCard
                item={item}
                index={index}
                colors={themeColors}
                isActive={item.id === activeInlineId}
                isPendingActive={item.id === pendingInlineId || isPendingWindow}
                allowDecodePrewarm={allowDecodePrewarm}
                isMuted={isMuted}
                isPaused={isPaused || shouldPauseForScroll}
                currentUserId={currentUserId}
                onToggleMute={toggleMute}
                onOpen={handleOpenVideo}
                onLike={toggleLike}
                onSave={toggleSave}
                onFollow={toggleFollow}
                onShare={toggleShare}
                onShop={toggleShop}
                onCarouselTouchStart={handleCarouselTouchStart}
                onCarouselTouchEnd={handleCarouselTouchEnd}
                isMeasurement={target === 'Measurement'}
                resolvedVideoSource={resolvedVideoSourcesRef.current[item.id] ?? null}
                networkType={(netInfo.type ?? null) as NetInfoStateType | null}
            />
        );
    }, [activeInlineId, currentUserId, handleCarouselTouchEnd, handleCarouselTouchStart, handleOpenVideo, isMuted, isPaused, netInfo.type, pendingInlineId, pendingInlineIndex, shouldPauseForScroll, themeColors, toggleFollow, toggleLike, toggleMute, toggleSave, toggleShare, toggleShop]);

    // Active item changes when card visibility crosses threshold
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: FEED_CONFIG.PLAY_VISIBILITY_THRESHOLD_PERCENT,
        minimumViewTime: 0,
    }).current;

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<InfiniteFeedVideo>[] }) => {
        let minCandidate: ViewToken<InfiniteFeedVideo> | null = null;
        let maxCandidate: ViewToken<InfiniteFeedVideo> | null = null;

        for (const token of viewableItems) {
            if (!token?.isViewable || !token.item || typeof token.index !== 'number') continue;
            if (!minCandidate || token.index < (minCandidate.index ?? Number.POSITIVE_INFINITY)) {
                minCandidate = token;
            }
            if (!maxCandidate || token.index > (maxCandidate.index ?? Number.NEGATIVE_INFINITY)) {
                maxCandidate = token;
            }
        }

        const nextViewable = scrollDirectionRef.current === 'up' ? minCandidate : maxCandidate;
        if (!nextViewable) return;

        const candidate = nextViewable?.item;
        const nextIndex = typeof nextViewable?.index === 'number' ? nextViewable.index : null;
        const hasPlayableSource = candidate?.postType === 'carousel' || !!getVideoUrl(candidate);
        const nextId = hasPlayableSource ? (candidate?.id ?? null) : null;
        const resolvedNextIndex = nextIndex ?? pendingActiveIndexRef.current;

        if (nextId === pendingActiveIdRef.current && resolvedNextIndex === pendingActiveIndexRef.current) return;
        pendingActiveIdRef.current = nextId;
        pendingActiveIndexRef.current = resolvedNextIndex;
        setPendingInlineId(nextId);
        setPendingInlineIndex(resolvedNextIndex);
        if (immediateActiveCommit) {
            commitPendingActive('viewable-immediate');
        }
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
        isFeedScrollingRef.current = true;
        logPerf(LogCode.PERF_MEASURE_START, 'Infinite feed scroll begin', {
            activeInlineIndex: activeInlineIndexRef.current,
        });
    }, [clearSettleTimer]);

    const handleMomentumScrollBegin = useCallback(() => {
        momentumStartedRef.current = true;
        if (!scrollStartAtRef.current) {
            scrollStartAtRef.current = Date.now();
        }
        isFeedScrollingRef.current = true;
    }, []);

    const handleMomentumScrollEnd = useCallback(() => {
        clearSettleTimer();
        momentumStartedRef.current = false;
        isFeedScrollingRef.current = false;
        commitPendingActive('momentum-end');
    }, [clearSettleTimer, commitPendingActive]);

    const handleScrollEndDrag = useCallback((_event: NativeSyntheticEvent<NativeScrollEvent>) => {
        clearSettleTimer();
        settleTimerRef.current = setTimeout(() => {
            if (momentumStartedRef.current) return;
            isFeedScrollingRef.current = false;
            commitPendingActive('drag-end-no-momentum');
        }, 32);
    }, [clearSettleTimer, commitPendingActive]);

    // Only track the active video's resolved source so cache-resolve for
    // non-visible videos doesn't trigger a full list re-render.
    const activeResolvedSource = activeInlineId ? resolvedVideoSources[activeInlineId] : null;

    const flashListExtraData = useMemo(() => ({
        activeInlineId,
        pendingInlineId,
        pendingInlineIndex,
        isMuted,
        isPaused,
        immediateActiveCommit,
        activeResolvedSource,
    }), [activeInlineId, activeResolvedSource, immediateActiveCommit, isMuted, isPaused, pendingInlineId, pendingInlineIndex]);

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
                removeClippedSubviews={false}
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
        </View>
    );
}
