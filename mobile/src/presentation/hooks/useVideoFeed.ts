import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Alert, Share, unstable_batchedUpdates } from 'react-native';
import { Video } from '../../domain/entities/Video';
import { VideoFeedCursor } from '../../domain/entities/VideoFeed';
import { GetVideoFeedUseCase } from '../../domain/usecases/GetVideoFeedUseCase';
import { ToggleLikeUseCase } from '../../domain/usecases/ToggleLikeUseCase';
import { ToggleSaveUseCase } from '../../domain/usecases/ToggleSaveUseCase';
import { ToggleFollowUseCase } from '../../domain/usecases/ToggleFollowUseCase';
import { VideoRepositoryImpl } from '../../data/repositories/VideoRepositoryImpl';
import { InteractionRepositoryImpl } from '../../data/repositories/InteractionRepositoryImpl';
import { VideoCacheService } from '../../data/services/VideoCacheService';
import { LogCode, logPerf, logError, logData, logSystem, logAuth } from '@/core/services/Logger';
import { FeedPrefetchService } from '../../data/services/FeedPrefetchService';
import { Image } from 'expo-image';
import { useActiveVideoStore } from '../store/useActiveVideoStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore } from '../store/useSocialStore';
import { useStartupStore, initStartupTimer } from '../store/useStartupStore';
import { useVideoCounterStore } from '../store/useVideoCounterStore';
import { useVideoEditStore, applyDescriptionOverridesToVideos } from '../store/useVideoEditStore';
import { useResolvedVideoCounters } from './useResolvedVideoCounters';
import { isVideoCacheDisabled } from '../../core/utils/videoCacheToggle';
import { getVideoUrl } from '../../core/utils/videoUrl';
import { stripRichTextTags } from '../../core/utils/richText';
import { FEED_DATA_CONFIG } from '../config/feedDataConfig';
import { queryClient, QUERY_KEYS } from '../../core/query/queryClient';

// Interfaces
interface UseVideoFeedReturn {
    videos: Video[];
    isLoading: boolean;
    isRefreshing: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    error: string | null;
    fetchFeed: () => Promise<void>;
    refreshFeed: () => Promise<void>;
    loadMore: () => Promise<void>;
    toggleLike: (videoId: string) => Promise<void>;
    toggleSave: (videoId: string) => Promise<void>;
    toggleFollow: (videoId: string) => Promise<void>;
    toggleShare: (videoId: string) => void;
    toggleShop: (videoId: string) => void;
    deleteVideo: (videoId: string) => Promise<void>;
    prependVideo: (video: Video) => void;
}

interface FeedMemoryCacheEntry {
    videos: Video[];
    cursor: VideoFeedCursor | null;
    hasMore: boolean;
    updatedAt: number;
}

const FEED_MEMORY_CACHE = new Map<string, FeedMemoryCacheEntry>();

const buildFeedMemoryCacheKey = (
    userId: string,
    filterUserId: string | undefined,
    pageSize: number
) => `${userId}::${filterUserId || 'all'}::${pageSize}`;

const isFeedVideoItem = (video: Video): boolean => {
    if (video.postType === 'carousel') return false;
    return Boolean(getVideoUrl(video));
};

export function useVideoFeed(filterUserId?: string, pageSize: number = 10): UseVideoFeedReturn {
    // Repository & UseCases (Memoized to prevent recreation)
    const videoRepository = useRef(new VideoRepositoryImpl()).current;
    const interactionRepository = useRef(new InteractionRepositoryImpl()).current;

    const getVideoFeedUseCase = useRef(new GetVideoFeedUseCase(videoRepository)).current;
    const toggleLikeUseCase = useRef(new ToggleLikeUseCase(interactionRepository)).current;
    const toggleSaveUseCase = useRef(new ToggleSaveUseCase(interactionRepository)).current;
    const toggleFollowUseCase = useRef(new ToggleFollowUseCase(interactionRepository)).current;
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10;
    const initialUserId = useAuthStore.getState().user?.id || 'anon';
    const initialFeedCacheKey = buildFeedMemoryCacheKey(initialUserId, filterUserId, safePageSize);
    const initialFeedCacheEntry = FEED_MEMORY_CACHE.get(initialFeedCacheKey) ?? null;

    // State
    const [videos, setVideos] = useState<Video[]>(() => initialFeedCacheEntry?.videos ?? []);
    const [isLoading, setIsLoading] = useState(() => !initialFeedCacheEntry);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cursor, setCursor] = useState<VideoFeedCursor | null>(() => initialFeedCacheEntry?.cursor ?? null);
    const [hasMore, setHasMore] = useState(() => initialFeedCacheEntry?.hasMore ?? true);

    const isMounted = useRef(true);
    const hasInitialFetch = useRef(Boolean(initialFeedCacheEntry)); // Prevent multiple initial fetches
    const pendingLikeVideoIdsRef = useRef<Set<string>>(new Set());
    const pendingSaveVideoIdsRef = useRef<Set<string>>(new Set());
    const personalizedFeedUserIdRef = useRef<string | null>(initialUserId);

    // Auth User
    const { user, isInitialized } = useAuthStore();

    // Social sync: Get following status from global store
    const followingMap = useSocialStore((state) => state.followingMap);
    const globalToggleFollow = useSocialStore((state) => state.toggleFollow);
    const syncSocialData = useSocialStore((state) => state.syncSocialData);
    const syncVideoCountersFromServer = useVideoCounterStore((state) => state.syncFromServer);
    const applyVideoCounterDelta = useVideoCounterStore((state) => state.applyLocalCounterDelta);
    const descriptionByVideoId = useVideoEditStore((state) => state.descriptionByVideoId);

    const setVideosWithDescriptionOverrides = useCallback(
        (nextVideosOrUpdater: Video[] | ((prevVideos: Video[]) => Video[])) => {
            setVideos((prevVideos) => {
                const nextVideos = typeof nextVideosOrUpdater === 'function'
                    ? nextVideosOrUpdater(prevVideos)
                    : nextVideosOrUpdater;
                return applyDescriptionOverridesToVideos(nextVideos, descriptionByVideoId);
            });
        },
        [descriptionByVideoId]
    );

    // Initialize Cache
    useEffect(() => {
        VideoCacheService.initialize();
        initStartupTimer();
    }, []);

    const isStartupComplete = useStartupStore((state) => state.isStartupComplete);

    // ============================================
    // PREFETCH MECHANISM (TikTok-style)
    // ============================================

    // 1. Initial Prefetch: When feed loads, prefetch first 3 videos
    const hasInitialPrefetched = useRef(false);
    const initialPrefetchFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const runInitialPrefetch = useCallback((reason: 'startup' | 'fallback') => {
        if (hasInitialPrefetched.current || isVideoCacheDisabled()) return;
        if (videos.length === 0) return;

        const initialIndices = videos
            .map((video, index) => (isFeedVideoItem(video) ? index : null))
            .filter((index): index is number => index != null)
            .slice(0, FEED_DATA_CONFIG.PREFETCH_AHEAD_COUNT);

        if (initialIndices.length === 0) return;

        hasInitialPrefetched.current = true;
        logPerf(LogCode.PREFETCH_START, 'Initial video prefetch starting', { reason });

        FeedPrefetchService.getInstance().queueVideos(videos, initialIndices, 0);
        initialIndices.forEach((index) => {
            const video = videos[index];
            const videoUrl = video ? getVideoUrl(video) : null;
            if (videoUrl) {
                VideoCacheService.warmupCache(videoUrl);
            }
            if (video?.thumbnailUrl) {
                Image.prefetch(video.thumbnailUrl);
            }
        });
    }, [videos]);
    useEffect(() => {
        if (initialPrefetchFallbackRef.current) {
            clearTimeout(initialPrefetchFallbackRef.current);
            initialPrefetchFallbackRef.current = null;
        }

        if (hasInitialPrefetched.current || videos.length === 0 || isVideoCacheDisabled()) return;

        if (isStartupComplete) {
            runInitialPrefetch('startup');
            return;
        }

        // Fallback: run initial prefetch even if startup flag never flips.
        initialPrefetchFallbackRef.current = setTimeout(() => {
            runInitialPrefetch('fallback');
        }, 4000);

        return () => {
            if (initialPrefetchFallbackRef.current) {
                clearTimeout(initialPrefetchFallbackRef.current);
                initialPrefetchFallbackRef.current = null;
            }
        };
    }, [videos.length, isStartupComplete, runInitialPrefetch]);

    // ============================================

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (Object.keys(descriptionByVideoId).length === 0) return;
        setVideos((prevVideos) => applyDescriptionOverridesToVideos(prevVideos, descriptionByVideoId));
    }, [descriptionByVideoId]);

    useEffect(() => {
        if (!isInitialized) return;
        const freshUserId = useAuthStore.getState().user?.id || 'anon';
        const cacheKey = buildFeedMemoryCacheKey(freshUserId, filterUserId, safePageSize);
        FEED_MEMORY_CACHE.set(cacheKey, {
            videos,
            cursor,
            hasMore,
            updatedAt: Date.now(),
        });
    }, [cursor, filterUserId, hasMore, isInitialized, safePageSize, videos, user?.id]);

    const fetchFeed = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Get fresh userId from store to avoid stale closure
            const freshUserId = useAuthStore.getState().user?.id || 'anon';
            const feedResult = await getVideoFeedUseCase.execute(safePageSize, freshUserId, filterUserId, null);
            const fetchedVideos = applyDescriptionOverridesToVideos(feedResult.videos, descriptionByVideoId);
            syncVideoCountersFromServer(fetchedVideos);

            if (isMounted.current) {
                setVideosWithDescriptionOverrides(fetchedVideos);
                setCursor(feedResult.nextCursor);
                setHasMore(Boolean(feedResult.nextCursor));

                // Sync initial data to global store
                fetchedVideos.forEach(v => {
                    syncSocialData(
                        v.user.id,
                        v.user.isFollowing,
                        v.user.followersCount || 0,
                        v.user.followingCount || 0
                    );
                });
            }
        } catch (err) {
            if (isMounted.current) {
                setError('Video yüklenirken hata oluştu. Lütfen tekrar deneyin.');
                logError(LogCode.FETCH_ERROR, 'Feed fetch error', err);
            }
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
            }
        }
    }, [descriptionByVideoId, getVideoFeedUseCase, filterUserId, safePageSize, setVideosWithDescriptionOverrides, syncSocialData, syncVideoCountersFromServer]); // Removed currentUserId from dependencies

    const refreshFeed = useCallback(async () => {
        if (isRefreshing) return;

        try {
            setIsRefreshing(true);
            setError(null);
            // Keep video cache on feed refresh so revisiting recently watched videos
            // can reopen from local storage instead of forcing network fetches.

            // Get fresh userId from store
            const freshUserId = useAuthStore.getState().user?.id || 'anon';
            const feedResult = await getVideoFeedUseCase.execute(safePageSize, freshUserId, filterUserId, null);
            const fetchedVideos = applyDescriptionOverridesToVideos(feedResult.videos, descriptionByVideoId);
            syncVideoCountersFromServer(fetchedVideos);

            if (isMounted.current) {
                setVideosWithDescriptionOverrides(fetchedVideos);
                setCursor(feedResult.nextCursor);
                setHasMore(Boolean(feedResult.nextCursor));

                // Sync to global store
                fetchedVideos.forEach(v => {
                    syncSocialData(
                        v.user.id,
                        v.user.isFollowing,
                        v.user.followersCount || 0,
                        v.user.followingCount || 0
                    );
                });
            }
        } catch (err) {
            if (isMounted.current) {
                setError('Yenileme başarısız oldu.');
                logError(LogCode.FETCH_ERROR, 'Feed refresh error', err);
            }
        } finally {
            if (isMounted.current) {
                setIsRefreshing(false);
            }
        }
    }, [descriptionByVideoId, isRefreshing, getVideoFeedUseCase, filterUserId, safePageSize, setVideosWithDescriptionOverrides, syncSocialData, syncVideoCountersFromServer]); // Removed currentUserId

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore || isLoading || !cursor) return;

        try {
            setIsLoadingMore(true);

            // Get fresh userId from store
            const freshUserId = useAuthStore.getState().user?.id || 'anon';
            const feedResult = await getVideoFeedUseCase.execute(safePageSize, freshUserId, filterUserId, cursor);
            const fetchedVideos = applyDescriptionOverridesToVideos(feedResult.videos, descriptionByVideoId);
            syncVideoCountersFromServer(fetchedVideos);
            const isCursorStuck =
                feedResult.nextCursor?.createdAt === cursor.createdAt &&
                feedResult.nextCursor?.id === cursor.id;

            if (isMounted.current) {
                if (fetchedVideos.length > 0) {
                    setVideosWithDescriptionOverrides(prev => {
                        const existingIds = new Set(prev.map((video) => video.id));
                        const uniqueVideos = fetchedVideos.filter((video) => !existingIds.has(video.id));
                        if (!uniqueVideos.length) return prev;
                        return [...prev, ...uniqueVideos];
                    });
                    setCursor(feedResult.nextCursor);
                    setHasMore(Boolean(feedResult.nextCursor) && !isCursorStuck);

                    // Sync extra data to global store
                    fetchedVideos.forEach(v => {
                        syncSocialData(
                            v.user.id,
                            v.user.isFollowing,
                            v.user.followersCount || 0,
                            v.user.followingCount || 0
                        );
                    });
                } else {
                    setCursor(feedResult.nextCursor);
                    setHasMore(Boolean(feedResult.nextCursor) && !isCursorStuck);
                }
            }
        } catch (err) {
            logError(LogCode.FETCH_ERROR, 'Load more error', err);
        } finally {
            if (isMounted.current) {
                setIsLoadingMore(false);
            }
        }
    }, [cursor, descriptionByVideoId, isLoadingMore, hasMore, isLoading, getVideoFeedUseCase, filterUserId, safePageSize, setVideosWithDescriptionOverrides, syncSocialData, syncVideoCountersFromServer]); // Removed currentUserId

    // Optimistic Update with Rollback
    const toggleLike = useCallback(async (videoId: string) => {
        if (!user) {
            Alert.alert('Giriş Yapmalısınız', 'Bu işlemi yapmak için giriş yapmalısınız.');
            return;
        }
        if (pendingLikeVideoIdsRef.current.has(videoId)) return;

        const targetVideo = videos.find((video) => video.id === videoId);
        if (!targetVideo) return;

        pendingLikeVideoIdsRef.current.add(videoId);
        const previousIsLiked = targetVideo.isLiked;
        const previousLikesCount = Math.max(0, targetVideo.likesCount || 0);
        const optimisticIsLiked = !previousIsLiked;
        const likeDelta = optimisticIsLiked ? 1 : -1;
        const optimisticLikesCount = Math.max(0, previousLikesCount + likeDelta);
        applyVideoCounterDelta(videoId, 'likesCount', likeDelta);

        // Optimistic update
        unstable_batchedUpdates(() => {
            setVideosWithDescriptionOverrides((prevVideos) =>
                prevVideos.map((video) => {
                    if (video.id === videoId) {
                        return {
                            ...video,
                            isLiked: optimisticIsLiked,
                            likesCount: optimisticLikesCount,
                        };
                    }
                    return video;
                })
            );
        });

        try {
            const freshUserId = useAuthStore.getState().user?.id || 'anon';
            const serverIsLiked = await toggleLikeUseCase.execute(videoId, freshUserId);
            const finalLikesCount = Math.max(0, previousLikesCount + (serverIsLiked ? 1 : -1));
            const correctionDelta = finalLikesCount - optimisticLikesCount;

            if (correctionDelta !== 0) {
                applyVideoCounterDelta(videoId, 'likesCount', correctionDelta);
            }

            unstable_batchedUpdates(() => {
                setVideosWithDescriptionOverrides((prevVideos) =>
                    prevVideos.map((video) => {
                        if (video.id === videoId) {
                            return {
                                ...video,
                                isLiked: serverIsLiked,
                                likesCount: finalLikesCount,
                            };
                        }
                        return video;
                    })
                );
            });

            // Invalidate profile query to update like counts if cached
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE(freshUserId) });
        } catch (err) {
            // Rollback on error
            logError(LogCode.DB_UPDATE, 'Toggle like failed, reverting', err);
            applyVideoCounterDelta(videoId, 'likesCount', -likeDelta);
            setVideosWithDescriptionOverrides((prevVideos) =>
                prevVideos.map((video) => {
                    if (video.id === videoId) {
                        return {
                            ...video,
                            isLiked: previousIsLiked,
                            likesCount: previousLikesCount,
                        };
                    }
                    return video;
                })
            );
        } finally {
            pendingLikeVideoIdsRef.current.delete(videoId);
        }
    }, [applyVideoCounterDelta, setVideosWithDescriptionOverrides, toggleLikeUseCase, user, videos]);

    const toggleSave = useCallback(async (videoId: string) => {
        if (!user) {
            Alert.alert('Giriş Yapmalısınız', 'Bu işlemi yapmak için giriş yapmalısınız.');
            return;
        }
        if (pendingSaveVideoIdsRef.current.has(videoId)) return;

        const targetVideo = videos.find((video) => video.id === videoId);
        if (!targetVideo) return;

        pendingSaveVideoIdsRef.current.add(videoId);
        const previousIsSaved = targetVideo.isSaved;
        const previousSavesCount = Math.max(0, targetVideo.savesCount || 0);
        const optimisticIsSaved = !previousIsSaved;
        const saveDelta = optimisticIsSaved ? 1 : -1;
        const optimisticSavesCount = Math.max(0, previousSavesCount + saveDelta);
        applyVideoCounterDelta(videoId, 'savesCount', saveDelta);

        // Optimistic update
        unstable_batchedUpdates(() => {
            setVideosWithDescriptionOverrides((prevVideos) =>
                prevVideos.map((video) => {
                    if (video.id === videoId) {
                        return {
                            ...video,
                            isSaved: optimisticIsSaved,
                            savesCount: optimisticSavesCount,
                        };
                    }
                    return video;
                })
            );
        });

        try {
            const freshUserId = useAuthStore.getState().user?.id || 'anon';
            const serverIsSaved = await toggleSaveUseCase.execute(videoId, freshUserId);
            const finalSavesCount = Math.max(0, previousSavesCount + (serverIsSaved ? 1 : -1));
            const correctionDelta = finalSavesCount - optimisticSavesCount;

            if (correctionDelta !== 0) {
                applyVideoCounterDelta(videoId, 'savesCount', correctionDelta);
            }

            unstable_batchedUpdates(() => {
                setVideosWithDescriptionOverrides((prevVideos) =>
                    prevVideos.map((video) => {
                        if (video.id === videoId) {
                            return {
                                ...video,
                                isSaved: serverIsSaved,
                                savesCount: finalSavesCount,
                            };
                        }
                        return video;
                    })
                );
            });

            // Invalidate saved videos and profile to reflect changes
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SAVED_VIDEOS(freshUserId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE(freshUserId) });
        } catch (err) {
            logError(LogCode.DB_UPDATE, 'Toggle save failed, reverting', err);
            applyVideoCounterDelta(videoId, 'savesCount', -saveDelta);
            // Rollback
            setVideosWithDescriptionOverrides((prevVideos) =>
                prevVideos.map((video) => {
                    if (video.id === videoId) {
                        return {
                            ...video,
                            isSaved: previousIsSaved,
                            savesCount: previousSavesCount,
                        };
                    }
                    return video;
                })
            );
        } finally {
            pendingSaveVideoIdsRef.current.delete(videoId);
        }
    }, [applyVideoCounterDelta, setVideosWithDescriptionOverrides, toggleSaveUseCase, user, videos]);

    const counterResolvedVideos = useResolvedVideoCounters(videos);

    // ✅ [PERF] Preserve object identity unless social state actually changed
    const syncedVideos = useMemo(() => counterResolvedVideos.map((video) => {
        const syncedIsFollowing = followingMap[video.user.id];
        if (syncedIsFollowing == null || syncedIsFollowing === video.user.isFollowing) {
            return video;
        }

        return {
            ...video,
            user: {
                ...video.user,
                isFollowing: syncedIsFollowing,
            },
        };
    }), [counterResolvedVideos, followingMap]);

    const toggleFollow = useCallback(async (videoId: string) => {
        if (!user) {
            Alert.alert('Giriş Yapmalısınız', 'Bu işlemi yapmak için giriş yapmalısınız.');
            return;
        }

        const video = videos.find(v => v.id === videoId);
        if (!video) return;

        const userIdToFollow = video.user.id;

        try {
            const freshUserId = useAuthStore.getState().user?.id || 'anon';
            // Use global store for the action - it handles optimistic updates and counts
            await globalToggleFollow(userIdToFollow, freshUserId);

            // Invalidate target user profile and current user profile (for following count)
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE(userIdToFollow) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE(freshUserId) });
        } catch (err) {
            // Error is handled in store
        }
    }, [videos, globalToggleFollow, user]);

    const incrementShareCount = useCallback(async (videoId: string) => {
        applyVideoCounterDelta(videoId, 'sharesCount', 1);
        setVideosWithDescriptionOverrides((prevVideos) =>
            prevVideos.map((video) => {
                if (video.id === videoId) {
                    return {
                        ...video,
                        sharesCount: video.sharesCount + 1,
                    };
                }
                return video;
            })
        );

        try {
            const { supabase } = require('../../core/supabase');
            const { error } = await supabase.rpc('increment_video_counter', {
                video_id: videoId,
                counter_column: 'shares_count'
            });

            if (error) throw error;
            logData(LogCode.DB_UPDATE, 'Share count synced to DB via RPC', { videoId });
        } catch (error) {
            logError(LogCode.DB_UPDATE, 'Failed to sync share count', error);
        }
    }, [applyVideoCounterDelta, setVideosWithDescriptionOverrides]);

    const toggleShare = useCallback(async (videoId: string) => {
        const video = videos.find(v => v.id === videoId);
        if (!video) return;

        const shareUrl = `wizyclub://video/${videoId}`;
        const cleanDescription = stripRichTextTags(video.description);
        const message = cleanDescription ? `${cleanDescription}\n${shareUrl}` : shareUrl;

        try {
            await Share.share({ message, url: shareUrl });
            await incrementShareCount(videoId);
        } catch (error) {
            logError(LogCode.ERROR_CAUGHT, 'Share failed', error);
        }
    }, [videos, incrementShareCount]);

    const toggleShop = useCallback((videoId: string) => {
        applyVideoCounterDelta(videoId, 'shopsCount', 1);
        setVideosWithDescriptionOverrides((prevVideos) =>
            prevVideos.map((video) => {
                if (video.id === videoId) {
                    return {
                        ...video,
                        shopsCount: video.shopsCount + 1,
                    };
                }
                return video;
            })
        );
    }, [applyVideoCounterDelta, setVideosWithDescriptionOverrides]);

    const deleteVideo = useCallback(async (videoId: string) => {
        // 1. Get current state
        const currentVideos = [...videos];
        const currentIndex = currentVideos.findIndex(v => v.id === videoId);

        // 2. Calculate next active video BEFORE removing
        let nextActiveId: string | null = null;
        let nextActiveIndex = 0;

        if (currentVideos.length > 1) {
            // If not the last video, next video is at same index
            // If last video, previous video becomes active
            if (currentIndex < currentVideos.length - 1) {
                nextActiveId = currentVideos[currentIndex + 1].id;
                nextActiveIndex = currentIndex; // Same index after removal
            } else {
                nextActiveId = currentVideos[currentIndex - 1].id;
                nextActiveIndex = currentIndex - 1;
            }
        }

        // 3. Switch to next video IMMEDIATELY (before network call for instant UX)
        const { setActiveVideo } = useActiveVideoStore.getState();
        if (nextActiveId) {
            logData(LogCode.DB_DELETE, 'Switching to next video after delete', { nextActiveId, nextActiveIndex });
            setActiveVideo(nextActiveId, nextActiveIndex);
        }

        // 4. Optimistic Update - Remove from list
        setVideosWithDescriptionOverrides((prev) => prev.filter(v => v.id !== videoId));

        // 5. Network call (background) with JWT authentication for HARD DELETE
        try {
            const { CONFIG } = require('../../core/config');
            const authState = useAuthStore.getState();
            const token = authState.session?.access_token;
            logAuth(LogCode.AUTH_SESSION_CHECK, 'Delete video auth state check', {
                hasSession: !!authState.session,
                hasUser: !!authState.user,
                hasToken: !!token,
            });

            // Soft delete (default)
            const response = await fetch(`${CONFIG.API_URL}/videos/${videoId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'Sunucu hatası');
            }
            logData(LogCode.DB_DELETE, 'Video deleted successfully', { videoId });

            // Invalidate profile to update counts
            const freshUserId = useAuthStore.getState().user?.id || 'anon';
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE(freshUserId) });
        } catch (error: unknown) {
            const err = error as Error;
            logError(LogCode.DB_DELETE, 'Video delete failed, rolling back', err);
            // Rollback on failure
            setVideosWithDescriptionOverrides(currentVideos);
            Alert.alert("Silme Başarısız", err.message || "Bilinmeyen hata");
        }
    }, [setVideosWithDescriptionOverrides, videos]);

    // 🔥 Prepend a newly uploaded video to the top of the feed
    const prependVideo = useCallback((newVideo: Video) => {
        syncVideoCountersFromServer([newVideo]);
        setVideosWithDescriptionOverrides(current => {
            // Prevent duplicates
            if (current.some(v => v.id === newVideo.id)) {
                logData(LogCode.REPO_SAVE, 'Video already exists, skipping prepend', { videoId: newVideo.id });
                return current;
            }
            logData(LogCode.REPO_SAVE, 'Prepending new video to feed', { videoId: newVideo.id });
            return [newVideo, ...current];
        });

        // Invalidate profile for upload count parity
        const freshUserId = useAuthStore.getState().user?.id || 'anon';
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE(freshUserId) });
    }, [setVideosWithDescriptionOverrides, syncVideoCountersFromServer]);

    // ✅ [PERF] Unified fetch effect
    // This handles both the initial load AND user changes (login/logout/switch)
    useEffect(() => {
        if (!isInitialized) return;

        const freshUserId = useAuthStore.getState().user?.id || 'anon';

        // If this is the first ever fetch OR the user has changed
        if (!hasInitialFetch.current || personalizedFeedUserIdRef.current !== freshUserId) {
            logData(LogCode.FETCH_START, 'Feed fetch triggered', {
                isInitial: !hasInitialFetch.current,
                userId: freshUserId
            });

            if (!hasInitialFetch.current) {
                hasInitialFetch.current = true;
                personalizedFeedUserIdRef.current = freshUserId;
                void fetchFeed();
            } else {
                // Subsequent user changes
                personalizedFeedUserIdRef.current = freshUserId;
                void refreshFeed();
            }
        }
    }, [isInitialized, user?.id, fetchFeed, refreshFeed]);

    return {
        videos: syncedVideos,
        isLoading,
        isRefreshing,
        isLoadingMore,
        hasMore,
        error,
        fetchFeed,
        refreshFeed,
        loadMore,
        toggleLike,
        toggleSave,
        toggleFollow,
        toggleShare,
        toggleShop,
        deleteVideo,
        prependVideo,
    };
}
