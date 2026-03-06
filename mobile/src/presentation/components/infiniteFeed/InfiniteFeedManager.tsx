import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    Pressable,
    Alert,
    RefreshControl,
    Dimensions,
    Platform,
    unstable_batchedUpdates,
    type NativeSyntheticEvent,
    type NativeScrollEvent,
} from 'react-native';
import { InteractionManager } from 'react-native';
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
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useThemeStore } from '../../store/useThemeStore';
import { DARK_COLORS, LIGHT_COLORS } from '../../../core/constants';
import { getVideoUrl } from '../../../core/utils/videoUrl';
import type { InfiniteFeedVideo } from './InfiniteFeedVideoTypes';
import { SwipeWrapper } from '../shared/SwipeWrapper';
import { InfiniteFeedHeader, FeedTab } from './InfiniteFeedHeader';
import { InfiniteFeedCard } from './InfiniteFeedCard';
import {
    InfiniteFeedMoreOptionsOverlay,
    type InfiniteFeedMoreOptionsOverlayHandle,
} from './InfiniteFeedMoreOptionsOverlay';
import { TaggedPeopleSheet } from './TaggedPeopleSheet';
import { styles } from './InfiniteFeedManager.styles';
import { FEED_FLAGS, FEED_CONFIG } from './hooks/useInfiniteFeedConfig';
import { useStories } from '../../hooks/useStories';
import { useVideoViewTracking } from '../../hooks/useVideoViewTracking';
import type { ViewToken } from 'react-native';
import { FeedPrefetchService } from '../../../data/services/FeedPrefetchService';
import { VideoCacheService } from '../../../data/services/VideoCacheService';
import { FeedQueryService } from '../../../data/services/FeedQueryService';
import { useInAppBrowserStore } from '../../store/useInAppBrowserStore';
import { PerformanceLogger } from '../../../core/services/PerformanceLogger';
import { useUploadStore } from '../../store/useUploadStore';
import { useUploadComposerStore } from '../../store/useUploadComposerStore';
import { useSubtitlePreferencesStore, type SubtitlePreferenceMode } from '../../store/useSubtitlePreferencesStore';
import { CONFIG } from '../../../core/config';
import { ThinSpinner } from '../shared/ThinSpinner';
import { useInfiniteFeedResolvedSourceStore } from './hooks/useInfiniteFeedResolvedSourceStore';

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

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const ESTIMATED_CARD_HEIGHT = Math.round(SCREEN_HEIGHT * 0.82);
const ESTIMATED_LIST_SIZE = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } as const;
const THUMBNAIL_PREFETCH_OFFSETS = [-2, -1, 1, 2, 3];
const FlashListAny = FlashList as any;
const INFINITE_WINDOW_SIZE = 5;
const INFINITE_MAX_RENDER_BATCH = 4;
const INFINITE_DRAW_DISTANCE = ESTIMATED_CARD_HEIGHT * 2;
const INFINITE_MINIMUM_VIEW_TIME_MS = 0;
const SCROLL_DIRECTION_COMMIT_DELTA_PX = 12;
const FLASH_LIST_CONTENT_CONTAINER_STYLE = { paddingBottom: 0 } as const;
const SUBTITLE_AVAILABILITY_CACHE_TTL_MS = 5 * 60 * 1000;
const SUBTITLE_AVAILABILITY_PENDING_RETRY_MS = 3000;
const getInfiniteFeedItemType = (item: InfiniteFeedVideo) => item.postType === 'carousel' ? 'carousel' : 'video';

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
    const subtitleMode = useSubtitlePreferencesStore((state) => state.mode);
    const setSubtitleMode = useSubtitlePreferencesStore((state) => state.setMode);
    const uploadStatus = useUploadStore((state) => state.status);
    const uploadedVideoId = useUploadStore((state) => state.uploadedVideoId);
    const uploadedVideoPayload = useUploadStore((state) => state.uploadedVideoPayload);
    const taggedPeoplePreview = useUploadStore((state) => state.taggedPeoplePreview);
    const resetUpload = useUploadStore((state) => state.reset);
    const globalIsPaused = useInfiniteFeedActiveVideoStore((state) => state.isPaused);
    const isScreenFocused = useInfiniteFeedActiveVideoStore((state) => state.isScreenFocused);

    const [activeTab, setActiveTab] = useState<FeedTab>('Sana Özel');
    const [selectedTaggedVideoId, setSelectedTaggedVideoId] = useState<string | null>(null);
    const [subtitleAvailabilityByVideoId, setSubtitleAvailabilityByVideoId] = useState<
        Record<string, { hasSubtitles: boolean; fetchedAt: number; isProcessing?: boolean }>
    >({});
    const videosRef = useRef(videos);
    const subtitleAvailabilityRef = useRef(subtitleAvailabilityByVideoId);

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
    // ✅ [PERF] isFeedScrolling is ref-only — no state needed, eliminates 4 re-renders per scroll gesture
    const isFeedScrollingRef = useRef(false);
    const activeInlineIdRef = useRef<string | null>(null);
    const activeInlineIndexRef = useRef<number>(0);
    const pendingActiveIdRef = useRef<string | null>(null);
    const pendingActiveIndexRef = useRef<number>(0);
    const momentumStartedRef = useRef(false);
    const isDraggingRef = useRef(false);
    const dragStartOffsetYRef = useRef(0);
    const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scrollStartAtRef = useRef<number | null>(null);
    const sourceResolveGenerationRef = useRef(0);
    const interactionPrefetchGenerationRef = useRef(0);
    const interactionPrefetchHandleRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
    const scrollDirectionRef = useRef<'up' | 'down'>('down');
    const lastScrollOffsetYRef = useRef(0);
    const listRef = useRef<any>(null);
    const moreOptionsOverlayRef = useRef<InfiniteFeedMoreOptionsOverlayHandle>(null);
    const taggedPeopleSheetRef = useRef<BottomSheetModal>(null);
    const lastHandledReselectRef = useRef(0);

    // ✅ [PERF] Refs for renderItem volatile values - prevents renderItem recreation
    const themeColorsRef = useRef(themeColors);
    const currentUserIdRef = useRef(currentUserId);
    const isMutedRef = useRef(isMuted);
    const netInfoTypeRef = useRef(netInfo.type);
    const subtitleModeRef = useRef(subtitleMode);
    const isInAppBrowserVisibleRef = useRef(isInAppBrowserVisible);
    const globalIsPausedRef = useRef(globalIsPaused);
    const isScreenFocusedRef = useRef(isScreenFocused);
    const isRouteFocusedRef = useRef(isRouteFocused);
    const activeStoryUserIdsRef = useRef<Set<string>>(new Set());
    const effectivePendingInlineIdRef = useRef<string | null>(null);
    const effectivePendingInlineIndexRef = useRef<number>(0);

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

    useEffect(() => {
        videosRef.current = videos;
    }, [videos]);

    useEffect(() => {
        useInfiniteFeedResolvedSourceStore.getState().pruneResolvedSources(videos.map((video) => video.id));
    }, [videos]);

    useEffect(() => {
        subtitleAvailabilityRef.current = subtitleAvailabilityByVideoId;
    }, [subtitleAvailabilityByVideoId]);

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

    const handleHeaderUploadPress = useCallback(() => {
        router.push('/upload');
    }, [router]);

    const handleHeaderCreateStoryPress = useCallback(() => {
        router.push({
            pathname: '/upload',
            params: { storyOnly: '1' },
        });
    }, [router]);

    const handleHeaderNotificationPress = useCallback(() => {
        router.push('/notifications');
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

    const handleOpenTaggedPeople = useCallback((videoId: string) => {
        setSelectedTaggedVideoId(videoId);
        taggedPeopleSheetRef.current?.present();
    }, []);

    const feedQueryServiceRef = useRef(new FeedQueryService());
    const handleHashtagPress = useCallback((hashtag: string) => {
        feedQueryServiceRef.current.recordHashtagClick(hashtag);
        router.push(`/search?q=${encodeURIComponent('#' + hashtag)}` as any);
    }, [router]);
    const handleLocationPress = useCallback((locationQuery: string) => {
        const trimmed = locationQuery.trim();
        if (!trimmed) return;
        router.push(`/search?q=${encodeURIComponent(trimmed)}&tab=${encodeURIComponent('Yerler')}` as any);
    }, [router]);

    const handleOpenMoreOptions = useCallback((videoId: string) => {
        const selectedVideo = videosRef.current.find((video) => video.id === videoId);
        if (!selectedVideo) return;

        moreOptionsOverlayRef.current?.open({
            currentUserId,
            showSubtitleOption: Boolean(subtitleAvailabilityRef.current[videoId]?.hasSubtitles),
            video: selectedVideo,
        });

        if (selectedVideo.postType !== 'video') {
            setSubtitleAvailabilityByVideoId((prev) => (
                prev[videoId]?.hasSubtitles === false
                    ? prev
                    : { ...prev, [videoId]: { hasSubtitles: false, fetchedAt: Date.now() } }
            ));
            moreOptionsOverlayRef.current?.updateSubtitleOption(videoId, false);
            return;
        }

        const cachedEntry = subtitleAvailabilityRef.current[videoId];
        const now = Date.now();
        const ttlMs = cachedEntry?.isProcessing ? SUBTITLE_AVAILABILITY_PENDING_RETRY_MS : SUBTITLE_AVAILABILITY_CACHE_TTL_MS;
        const isCacheFresh = cachedEntry && (now - cachedEntry.fetchedAt) < ttlMs;
        if (isCacheFresh) return;

        void (async () => {
            try {
                const response = await fetch(`${CONFIG.API_URL}/videos/${videoId}/subtitles`);
                if (!response.ok) {
                    setSubtitleAvailabilityByVideoId((prev) => ({
                        ...prev,
                        [videoId]: { hasSubtitles: false, fetchedAt: Date.now() },
                    }));
                    return;
                }
                const payload = await response.json();
                const rows = Array.isArray(payload?.data) ? payload.data : [];
                const hasPendingSubtitles = rows.some((row: any) => {
                    const status = String(row?.status || '').toLowerCase();
                    return status === 'processing' || status === 'queued' || status === 'pending';
                });
                const hasCompletedSubtitles = rows.some((row: any) => {
                    if (row?.status !== 'completed') return false;
                    const parsedSegments = typeof row?.segments === 'string'
                        ? (() => {
                            try {
                                return JSON.parse(row.segments);
                            } catch {
                                return [];
                            }
                        })()
                        : row?.segments;
                    const segments = Array.isArray(parsedSegments)
                        ? parsedSegments
                        : (Array.isArray(parsedSegments?.segments) ? parsedSegments.segments : []);
                    return segments.length > 0;
                });
                setSubtitleAvailabilityByVideoId((prev) => ({
                    ...prev,
                    [videoId]: {
                        hasSubtitles: hasCompletedSubtitles,
                        fetchedAt: Date.now(),
                        isProcessing: hasPendingSubtitles && !hasCompletedSubtitles,
                    },
                }));
                moreOptionsOverlayRef.current?.updateSubtitleOption(videoId, hasCompletedSubtitles);
            } catch {
                setSubtitleAvailabilityByVideoId((prev) => ({
                    ...prev,
                    [videoId]: { hasSubtitles: false, fetchedAt: Date.now(), isProcessing: false },
                }));
                moreOptionsOverlayRef.current?.updateSubtitleOption(videoId, false);
            }
        })();
    }, [currentUserId]);

    const handleMoreSheetEdit = useCallback(async (selectedVideo: InfiniteFeedVideo) => {
        const targetId = selectedVideo.id;
        const isOwnVideo = !!currentUserId && selectedVideo.user?.id === currentUserId;
        if (!isOwnVideo) return;

        // Fetch hashtags for this video
        let editTags: string[] = [];
        try {
            editTags = await feedQueryServiceRef.current.getVideoHashtags(targetId);
        } catch { }

        // Map tagged people to UploadComposerTaggedUser format
        const editTaggedPeople = (selectedVideo.taggedPeople ?? []).map((p) => ({
            id: p.id,
            username: p.username,
            fullName: p.fullName,
            avatarUrl: p.avatarUrl,
            isVerified: p.isVerified,
            followersCount: 0,
        }));

        // Fotoğraf/carousel için thumbnail veya mediaUrls'den al
        const firstMedia = selectedVideo.mediaUrls?.[0];
        const editVideoUrl = selectedVideo.videoUrl || firstMedia?.url || '';
        const editThumbnailUrl = selectedVideo.thumbnailUrl || firstMedia?.thumbnail || firstMedia?.url || '';
        const isPhotoPost = selectedVideo.postType === 'carousel' || (!selectedVideo.videoUrl && firstMedia?.type === 'image');

        // Mevcut altyazıları çek ve cache'e yükle (yeniden STT maliyeti olmasın)
        if (!isPhotoPost && editVideoUrl) {
            try {
                const subtitleRes = await fetch(`${CONFIG.API_URL}/videos/${targetId}/subtitles`);
                if (subtitleRes.ok) {
                    const subtitleResult = await subtitleRes.json();
                    const rows = Array.isArray(subtitleResult?.data) ? subtitleResult.data : [];
                    const completedSubs = rows.filter((s: any) => s?.status === 'completed');
                    const sub = completedSubs.find((s: any) => s.language === 'auto') || completedSubs[0];

                    if (sub?.segments) {
                        let parsed = sub.segments;
                        if (typeof parsed === 'string') {
                            try { parsed = JSON.parse(parsed); } catch { }
                        }
                        const segments = Array.isArray(parsed?.segments) ? parsed.segments : (Array.isArray(parsed) ? parsed : []);
                        const presentation = parsed?.presentation || null;
                        const style = parsed?.style || null;

                        if (segments.length > 0) {
                            const store = useUploadComposerStore.getState();
                            store.updateSubtitleCache(editVideoUrl, segments);
                            if (presentation) store.updateSubtitlePresentation(editVideoUrl, presentation);
                            if (style) store.updateSubtitleStyle(editVideoUrl, style);
                        }
                    }
                }
            } catch { }
        }

        useUploadComposerStore.getState().setDraft({
            selectedAssets: [],
            uploadMode: 'video',
            coverAssetIndex: 0,
            playbackRate: 1,
            videoVolume: 1,
            cropRatio: '9:16',
            filterPreset: 'none',
            qualityPreset: 'medium',
            subtitleLanguage: 'auto',
            trimStartSec: 0,
            trimEndSec: 0,
            editVideoId: targetId,
            editVideoUrl,
            editThumbnailUrl,
            editDescription: selectedVideo.description ?? '',
            editCommercialType: selectedVideo.commercialType ?? undefined,
            editBrandName: selectedVideo.brandName ?? undefined,
            editBrandUrl: selectedVideo.brandUrl ?? undefined,
            editTags,
            editTaggedPeople,
        });

        // Fotoğraf postları için doğrudan UploadDetails'a git (subtitle düzenleme yok)
        if (isPhotoPost) {
            router.push('/UploadDetails' as any);
        } else {
            router.push('/upload-composer' as any);
        }
    }, [currentUserId, router]);

    const handleConfirmMoreDelete = useCallback((videoId: string) => {
        void deleteVideo(videoId);
    }, [deleteVideo]);

    const handleMoreSheetUnfollow = useCallback((videoId: string) => {
        toggleFollow(videoId);
    }, [toggleFollow]);

    const handleMoreSheetWhyThisPost = useCallback(() => {
        Alert.alert('Neden bu gönderi?', 'Takip ettiğin hesaplar ve ilgi alanlarına göre öneriler gösteriyoruz.');
    }, []);

    const handleMoreSheetShowMore = useCallback(() => {
        Alert.alert('Tercihin kaydedildi', 'Bu tarz gönderileri daha fazla göstereceğiz.');
    }, []);

    const handleMoreSheetSave = useCallback((videoId: string) => {
        toggleSave(videoId);
    }, [toggleSave]);

    const handleMoreSheetQrCode = useCallback(() => {
        Alert.alert('QR kodu', 'Bu içerik için QR kodu yakında eklenecek.');
    }, []);

    const handleMoreSheetAboutAccount = useCallback((userId: string) => {
        handleOpenProfile(userId);
    }, [handleOpenProfile]);

    const handleMoreSheetSubtitleModeChange = useCallback((mode: SubtitlePreferenceMode) => {
        setSubtitleMode(mode);
    }, [setSubtitleMode]);

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
        useInfiniteFeedResolvedSourceStore.getState().setResolvedSource(videoId, source);
    }, []);

    const clearSettleTimer = useCallback(() => {
        if (!settleTimerRef.current) return;
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
    }, []);

    const activateTopVideo = useCallback((videoId: string) => {
        clearSettleTimer();
        momentumStartedRef.current = false;
        isFeedScrollingRef.current = false;
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
        setScreenFocused(true);
        setPaused(false);
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
        requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
        });
    }, [clearSettleTimer, immediateActiveCommit, setActiveVideo, setPaused, setScreenFocused]);

    useEffect(() => {
        if (!uploadedVideoId || uploadStatus !== 'success' || !prependVideo) return;

        let cancelled = false;

        const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
        const waitFrames = (count: number) => new Promise<void>((resolve) => {
            let remaining = Math.max(0, count);
            const tick = () => {
                if (cancelled || remaining <= 0) {
                    resolve();
                    return;
                }
                remaining -= 1;
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });

        const handleUploadSuccess = async () => {
            // Keep success preview visible briefly before injecting the new post.
            await wait(2000);
            if (cancelled) return;

            const immediateVideo = feedQueryServiceRef.current.mapUploadedVideoForFeed(uploadedVideoPayload);
            const videoData = immediateVideo || await feedQueryServiceRef.current.waitForVideoForFeed(uploadedVideoId, {
                attempts: 5,
                delayMs: 120,
            });
            if (cancelled) return;

            if (!videoData) {
                await refreshFeed();
                if (!cancelled) {
                    await waitFrames(2);
                    if (cancelled) return;
                    activateTopVideo(uploadedVideoId);
                    resetUpload();
                }
                return;
            }

            const uploadedVideo: InfiniteFeedVideo = taggedPeoplePreview.length > 0
                ? {
                    ...videoData,
                    taggedPeople: taggedPeoplePreview,
                }
                : videoData;

            prependVideo(uploadedVideo);
            await waitFrames(2);
            if (cancelled) return;
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
        taggedPeoplePreview,
        uploadedVideoId,
        uploadedVideoPayload,
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
        if (!videos.length || activeInlineIndex < 0 || activeInlineIndex >= videos.length) {
            return;
        }

        const activeVideoId = videos[activeInlineIndex]?.id ?? null;
        const nextVideoId = videos[activeInlineIndex + 1]?.id ?? null;
        const keepIds = new Set<string>();
        if (activeVideoId) keepIds.add(activeVideoId);
        if (nextVideoId) keepIds.add(nextVideoId);
        useInfiniteFeedResolvedSourceStore.getState().pruneResolvedSources(Array.from(keepIds));
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
        interactionPrefetchHandleRef.current?.cancel?.();
        interactionPrefetchHandleRef.current = null;
        useInfiniteFeedResolvedSourceStore.getState().clearResolvedSources();
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
        interactionPrefetchHandleRef.current?.cancel?.();
        interactionPrefetchHandleRef.current = null;
        const prefetchGeneration = ++interactionPrefetchGenerationRef.current;

        // ✅ [PERF] Read from ref — no useState dependency needed
        const prefetchService = FeedPrefetchService.getInstance();
        if (isFeedScrollingRef.current) {
            const candidateIndices = scrollDirectionRef.current === 'up'
                ? [activeInlineIndex - 1, activeInlineIndex - 2, activeInlineIndex + 1]
                : [activeInlineIndex + 1, activeInlineIndex + 2, activeInlineIndex - 1];

            candidateIndices.forEach((candidateIndex, order) => {
                if (candidateIndex < 0 || candidateIndex >= videos.length) return;
                const candidateVideo = videos[candidateIndex];
                if (!candidateVideo) return;

                if (candidateVideo.thumbnailUrl) {
                    ExpoImage.prefetch(candidateVideo.thumbnailUrl);
                }

                if (candidateVideo.postType === 'carousel') return;
                const candidateUrl = getVideoUrl(candidateVideo);
                if (!candidateUrl) return;

                const priority = order === 0 ? 0 : (order === 1 ? 1 : 2);
                prefetchService.bumpPriority(candidateUrl, priority);
                prefetchService.queueSingleVideo(candidateUrl, priority);
                VideoCacheService.warmupCache(candidateUrl);

                if (order !== 0) return;
                const memoryCached = VideoCacheService.getMemoryCachedPath(candidateUrl);
                if (memoryCached) {
                    setResolvedSourceForId(candidateVideo.id, memoryCached);
                    return;
                }

                const hasResolvedSource = Boolean(useInfiniteFeedResolvedSourceStore.getState().sources[candidateVideo.id]);
                if (hasResolvedSource) return;

                prefetchService.cacheVideoNow(candidateUrl)
                    .then((cachedPath) => {
                        if (interactionPrefetchGenerationRef.current !== prefetchGeneration) return;
                        if (!cachedPath) return;
                        setResolvedSourceForId(candidateVideo.id, cachedPath);
                    })
                    .catch(() => {
                        // best effort: avoid blocking scroll if eager cache fails
                    });
            });
            return;
        }
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
                // Active video already cached — allow full prefetch for upcoming videos
                prefetchService.resumeAfterActiveVideo();
            } else {
                // Active video loading from network — throttle prefetch to prioritize playback
                prefetchService.pauseForActiveVideo();
                const previousResolved = useInfiniteFeedResolvedSourceStore.getState().sources[activeVideo.id] ?? null;
                const hasResolvedFallback = Boolean(previousResolved);
                prefetchService.cacheVideoNow(activeVideoUrl)
                    .then((cachedPath) => {
                        // Active video cached — restore full prefetch bandwidth
                        prefetchService.resumeAfterActiveVideo();
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
                        prefetchService.resumeAfterActiveVideo();
                        if (!hasResolvedFallback) {
                            setResolvedSourceForId(activeVideo.id, null);
                        }
                    });
            }
        }

        // ✅ [PERF] Defer neighbor prefetch to avoid blocking active video playback start
        interactionPrefetchHandleRef.current = InteractionManager.runAfterInteractions(() => {
            if (interactionPrefetchGenerationRef.current !== prefetchGeneration) return;
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

                const hasResolvedSource = Boolean(useInfiniteFeedResolvedSourceStore.getState().sources[neighborVideo.id]);
                const shouldForceImmediateCache = idx === nextPlayableIndex && !hasResolvedSource;
                const resolvePromise = shouldForceImmediateCache
                    ? prefetchService.cacheVideoNow(url).then((cachedPath) => cachedPath ?? prefetchService.getCachedPath(url))
                    : prefetchService.getCachedPath(url);

                resolvePromise
                    .then((cachedPath) => {
                        if (interactionPrefetchGenerationRef.current !== prefetchGeneration) return;
                        if (!cachedPath || !shouldPublishResolvedSource) return;
                        setResolvedSourceForId(neighborVideo.id, cachedPath);
                    })
                    .catch(() => {
                        // best effort: nearby cache resolve failures should not block playback
                    });
            });
        });
        // ✅ [PERF] isFeedScrolling removed from deps — ref-only; effect re-runs when
        // activeInlineIndex changes (which happens after scroll commits via commitPendingActive)
        return () => {
            interactionPrefetchHandleRef.current?.cancel?.();
            interactionPrefetchHandleRef.current = null;
        };
    }, [activeInlineIndex, videos, setResolvedSourceForId]);


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
        onTagPress: handleOpenTaggedPeople,
        onHashtagPress: handleHashtagPress,
        onLocationPress: handleLocationPress,
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
            onTagPress: handleOpenTaggedPeople,
            onHashtagPress: handleHashtagPress,
            onLocationPress: handleLocationPress,
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
        handleOpenTaggedPeople,
        handleHashtagPress,
        handleLocationPress,
    ]);

    // ✅ [PERF] Sync volatile refs for renderItem (no re-render trigger)
    useEffect(() => {
        themeColorsRef.current = themeColors;
        currentUserIdRef.current = currentUserId;
        isMutedRef.current = isMuted;
        netInfoTypeRef.current = netInfo.type;
        subtitleModeRef.current = subtitleMode;
        isInAppBrowserVisibleRef.current = isInAppBrowserVisible;
        globalIsPausedRef.current = globalIsPaused;
        isScreenFocusedRef.current = isScreenFocused;
        isRouteFocusedRef.current = isRouteFocused;
        activeStoryUserIdsRef.current = activeStoryUserIds;
    });

    const effectivePendingInlineId = immediateActiveCommit ? activeInlineId : pendingInlineId;
    const effectivePendingInlineIndex = immediateActiveCommit ? activeInlineIndex : pendingInlineIndex;
    effectivePendingInlineIdRef.current = effectivePendingInlineId;
    effectivePendingInlineIndexRef.current = effectivePendingInlineIndex;

    // ✅ [PERF] Optimized renderItem - uses refs for volatile values (10 deps → 5 deps)
    const renderItem = useCallback(({ item, index, target }: { item: InfiniteFeedVideo; index: number; target?: string }) => {
        const handlers = cardActionHandlersRef.current;
        const colors = themeColorsRef.current;
        const userId = currentUserIdRef.current;
        const muted = isMutedRef.current;
        const browserVisible = isInAppBrowserVisibleRef.current;
        const pausedByLifecycle = globalIsPausedRef.current || !isScreenFocusedRef.current || !isRouteFocusedRef.current;
        const networkType = (netInfoTypeRef.current ?? null) as NetInfoStateType | null;
        const shouldShowSubtitle = subtitleModeRef.current !== 'off';

        const pendingIdx = effectivePendingInlineIndexRef.current;
        const pendingId = effectivePendingInlineIdRef.current;
        const prewarmRange = FEED_CONFIG.DECODE_PREWARM_AHEAD_COUNT;
        const prewarmPlayRange = FEED_CONFIG.DECODE_PREWARM_PLAY_COUNT;
        const prewarmDistance = scrollDirectionRef.current === 'up'
            ? pendingIdx - index
            : index - pendingIdx;
        const isPendingWindow = scrollDirectionRef.current === 'up'
            ? (index <= pendingIdx && index >= pendingIdx - prewarmRange)
            : (index >= pendingIdx && index <= pendingIdx + prewarmRange);
        const allowDecodePrewarm = prewarmDistance >= 1 && prewarmDistance <= prewarmPlayRange;
        const hasActiveStory = Boolean(item.user?.id && activeStoryUserIdsRef.current.has(item.user.id));

        return (
            <InfiniteFeedCard
                item={item}
                index={index}
                activeIndex={activeInlineIndexRef.current}
                colors={colors}
                isActive={item.id === activeInlineIdRef.current}
                isPendingActive={item.id === pendingId || isPendingWindow}
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
                onTagPress={handlers.onTagPress}
                onHashtagPress={handlers.onHashtagPress}
                onLocationPress={handlers.onLocationPress}
                onCarouselTouchStart={handlers.onCarouselTouchStart}
                onCarouselTouchEnd={handlers.onCarouselTouchEnd}
                isMeasurement={target === 'Measurement'}
                networkType={networkType}
                shouldShowSubtitle={shouldShowSubtitle}
            />
        );
    }, []);

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
        // Ignore idle/lifecycle viewability churn while feed is not actively scrolling.
        // This prevents active video from flapping and restarting due to tiny layout shifts.
        if (!isFeedScrollingRef.current && !momentumStartedRef.current && activeInlineIdRef.current) {
            return;
        }

        const visiblePlayableTokens = (viewableItems ?? []).filter((token) => {
            if (!token?.isViewable || !token.item || typeof token.index !== 'number') return false;
            return token.item.postType === 'carousel' || !!getVideoUrl(token.item);
        });

        if (visiblePlayableTokens.length === 0) return;

        const sortedVisible = [...visiblePlayableTokens].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        const currentActiveId = activeInlineIdRef.current;
        const currentActiveIndex = activeInlineIndexRef.current;
        const isCurrentActiveStillVisible = Boolean(
            currentActiveId && sortedVisible.some((token) => (
                token.item?.id === currentActiveId
                && typeof token.index === 'number'
                && token.index === currentActiveIndex
            ))
        );

        // Requirement: when next video reaches visibility threshold (30%), it should take over.
        // So prefer directional "next" candidate first.
        let nextViewable: ViewToken<InfiniteFeedVideo> | undefined;
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

        // If no directional candidate is available and current is still visible, keep current.
        if (!nextViewable && isCurrentActiveStillVisible) return;

        // Fast fling / edge case fallback: choose nearest visible item.
        if (!nextViewable) {
            nextViewable = [...sortedVisible].sort((a, b) => {
                const indexA = typeof a.index === 'number' ? a.index : Number.MAX_SAFE_INTEGER;
                const indexB = typeof b.index === 'number' ? b.index : Number.MAX_SAFE_INTEGER;
                const distanceA = Math.abs(indexA - currentActiveIndex);
                const distanceB = Math.abs(indexB - currentActiveIndex);
                return distanceA - distanceB;
            })[0];
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
        if (isDraggingRef.current) {
            const dragDelta = offsetY - dragStartOffsetYRef.current;
            if (dragDelta > SCROLL_DIRECTION_COMMIT_DELTA_PX) {
                scrollDirectionRef.current = 'down';
            } else if (dragDelta < -SCROLL_DIRECTION_COMMIT_DELTA_PX) {
                scrollDirectionRef.current = 'up';
            }
        }
        lastScrollOffsetYRef.current = offsetY;
    }, []);

    const handleScrollBeginDrag = useCallback(() => {
        clearSettleTimer();
        momentumStartedRef.current = false;
        isDraggingRef.current = true;
        dragStartOffsetYRef.current = lastScrollOffsetYRef.current;
        scrollStartAtRef.current = Date.now();
        isFeedScrollingRef.current = true;
    }, [clearSettleTimer]);

    const handleMomentumScrollBegin = useCallback(() => {
        momentumStartedRef.current = true;
        isDraggingRef.current = false;
        if (!scrollStartAtRef.current) {
            scrollStartAtRef.current = Date.now();
        }
        isFeedScrollingRef.current = true;
    }, []);

    const handleMomentumScrollEnd = useCallback(() => {
        clearSettleTimer();
        momentumStartedRef.current = false;
        isDraggingRef.current = false;
        isFeedScrollingRef.current = false;
        commitPendingActive('momentum-end');
    }, [clearSettleTimer, commitPendingActive]);

    const handleScrollEndDrag = useCallback((_event: NativeSyntheticEvent<NativeScrollEvent>) => {
        clearSettleTimer();
        isDraggingRef.current = false;
        settleTimerRef.current = setTimeout(() => {
            if (momentumStartedRef.current) return;
            isFeedScrollingRef.current = false;
            commitPendingActive('drag-end-no-momentum');
        }, 32);
    }, [clearSettleTimer, commitPendingActive]);

    const playbackPauseGate = isInAppBrowserVisible || globalIsPaused || !isScreenFocused || !isRouteFocused;

    const flashListExtraData = useMemo(() => ({
        activeInlineId,
        isMuted,
        playbackPauseGate,
        subtitleMode,
    }), [activeInlineId, isMuted, playbackPauseGate, subtitleMode]);

    const listEmpty = (
        <View style={styles.emptyState}>
            {isLoading ? (
                <ThinSpinner size={80} color={themeColors.textPrimary} />
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

    const listHeaderComponent = useMemo(() => {
        if (FEED_FLAGS.INF_DISABLE_HEADER_TABS) {
            return <View style={{ height: insets.top }} />;
        }

        return (
            <InfiniteFeedHeader
                activeTab={activeTab}
                onTabChange={setActiveTab}
                colors={themeColors}
                insetTop={insets.top}
                onUploadPress={handleHeaderUploadPress}
                onCreateStoryPress={handleHeaderCreateStoryPress}
                onNotificationPress={handleHeaderNotificationPress}
                storyUsers={storyUsers}
                onStoryAvatarPress={handleStoryAvatarPress}
            />
        );
    }, [
        activeTab,
        handleHeaderCreateStoryPress,
        handleHeaderNotificationPress,
        handleHeaderUploadPress,
        handleStoryAvatarPress,
        insets.top,
        storyUsers,
        themeColors,
    ]);

    const listFooterComponent = useMemo(() => {
        if (!isLoadingMore) return null;
        return <ThinSpinner size={48} color={themeColors.textPrimary} style={styles.footerLoader} />;
    }, [isLoadingMore, themeColors.textPrimary]);

    return (
        <SwipeWrapper
            onSwipeRight={() => router.push('/upload')}
            onSwipeLeft={() => router.navigate('/explore')}
            edgeOnly={true}
            edgeTopInset={96}
        >
            <View style={[styles.container, { backgroundColor: themeColors.background }]}>
                <FlashListAny
                    ref={listRef}
                    data={videos}
                    renderItem={renderItem}
                    getItemType={getInfiniteFeedItemType}
                    keyExtractor={(item: InfiniteFeedVideo) => item.id}
                    extraData={flashListExtraData}
                    viewabilityConfig={viewabilityConfig}
                    onViewableItemsChanged={onViewableItemsChanged}
                    onScrollBeginDrag={handleScrollBeginDrag}
                    onScrollEndDrag={handleScrollEndDrag}
                    onMomentumScrollBegin={handleMomentumScrollBegin}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    estimatedListSize={ESTIMATED_LIST_SIZE}
                    estimatedItemSize={ESTIMATED_CARD_HEIGHT}
                    removeClippedSubviews={Platform.OS === 'android'}
                    maxToRenderPerBatch={INFINITE_MAX_RENDER_BATCH}
                    windowSize={INFINITE_WINDOW_SIZE}
                    drawDistance={INFINITE_DRAW_DISTANCE}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={!isCarouselInteracting}
                    ListHeaderComponent={listHeaderComponent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={refreshFeed}
                            tintColor={themeColors.textPrimary}
                        />
                    }
                    onEndReached={hasMore ? loadMore : undefined}
                    onEndReachedThreshold={0.6}
                    ListFooterComponent={listFooterComponent}
                    ListEmptyComponent={listEmpty}
                    contentContainerStyle={FLASH_LIST_CONTENT_CONTAINER_STYLE}
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
                    pointerEvents="box-none"
                >
                    <InfiniteFeedMoreOptionsOverlay
                        ref={moreOptionsOverlayRef}
                        onSavePress={handleMoreSheetSave}
                        onQrCodePress={handleMoreSheetQrCode}
                        onEditPress={handleMoreSheetEdit}
                        onDeleteConfirm={handleConfirmMoreDelete}
                        onUnfollowPress={handleMoreSheetUnfollow}
                        onWhyThisPostPress={handleMoreSheetWhyThisPost}
                        onShowMorePress={handleMoreSheetShowMore}
                        onAboutAccountPress={handleMoreSheetAboutAccount}
                        subtitleMode={subtitleMode}
                        onSubtitleModeChange={handleMoreSheetSubtitleModeChange}
                    />
                    <TaggedPeopleSheet
                        sheetRef={taggedPeopleSheetRef}
                        taggedPeople={videos.find(v => v.id === selectedTaggedVideoId)?.taggedPeople || []}
                        onClose={() => taggedPeopleSheetRef.current?.dismiss()}
                        onUserPress={(userId) => {
                            taggedPeopleSheetRef.current?.dismiss();
                            handleOpenProfile(userId);
                        }}
                    />
                </View>
            </View>
        </SwipeWrapper>
    );
}
