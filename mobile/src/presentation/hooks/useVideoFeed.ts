import { useEffect, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { Video } from '../../domain/entities/Video';
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
import { isVideoCacheDisabled } from '../../core/utils/videoCacheToggle';
import { getVideoUrl } from '../../core/utils/videoUrl';

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

const isFeedVideoItem = (video: Video): boolean => {
    if (video.postType === 'carousel') return false;
    return Boolean(getVideoUrl(video));
};

export function useVideoFeed(filterUserId?: string): UseVideoFeedReturn {
    // Repository & UseCases (Memoized to prevent recreation)
    const videoRepository = useRef(new VideoRepositoryImpl()).current;
    const interactionRepository = useRef(new InteractionRepositoryImpl()).current;

    const getVideoFeedUseCase = useRef(new GetVideoFeedUseCase(videoRepository)).current;
    const toggleLikeUseCase = useRef(new ToggleLikeUseCase(interactionRepository)).current;
    const toggleSaveUseCase = useRef(new ToggleSaveUseCase(interactionRepository)).current;
    const toggleFollowUseCase = useRef(new ToggleFollowUseCase(interactionRepository)).current;

    // State
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const isMounted = useRef(true);
    const hasInitialFetch = useRef(false); // Prevent multiple initial fetches

    // Auth User
    const { user, isInitialized } = useAuthStore();
    const currentUserId = user?.id || 'anon';

    // Social sync: Get following status from global store
    const followingMap = useSocialStore((state) => state.followingMap);
    const globalToggleFollow = useSocialStore((state) => state.toggleFollow);
    const syncSocialData = useSocialStore((state) => state.syncSocialData);

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
            .slice(0, 3);

        if (initialIndices.length === 0) return;

        hasInitialPrefetched.current = true;
        logPerf(LogCode.PREFETCH_START, 'Initial video prefetch starting', { reason });

        FeedPrefetchService.getInstance().queueVideos(videos, initialIndices, 0);
        initialIndices.forEach((index) => {
            const video = videos[index];
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

    const fetchFeed = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            // Get fresh userId from store to avoid stale closure
            const freshUserId = useAuthStore.getState().user?.id || 'anon';
            const fetchedVideos = await getVideoFeedUseCase.execute(1, 10, freshUserId, filterUserId);

            if (isMounted.current) {
                setVideos(fetchedVideos);
                setPage(2);
                setHasMore(fetchedVideos.length >= 10);

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
    }, [getVideoFeedUseCase, filterUserId, syncSocialData]); // Removed currentUserId from dependencies

    const refreshFeed = useCallback(async () => {
        if (isRefreshing) return;

        try {
            setIsRefreshing(true);
            setError(null);
            // Clear cache on refresh to resolve any persistence issues with same-named files
            await VideoCacheService.clearCache();

            // Get fresh userId from store
            const freshUserId = useAuthStore.getState().user?.id || 'anon';
            // Reset to page 1
            const fetchedVideos = await getVideoFeedUseCase.execute(1, 10, freshUserId, filterUserId);

            if (isMounted.current) {
                setVideos(fetchedVideos);
                setPage(2);
                setHasMore(fetchedVideos.length >= 10);

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
    }, [isRefreshing, getVideoFeedUseCase, filterUserId, syncSocialData]); // Removed currentUserId

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore || isLoading) return;

        try {
            setIsLoadingMore(true);

            // Get fresh userId from store
            const freshUserId = useAuthStore.getState().user?.id || 'anon';
            const fetchedVideos = await getVideoFeedUseCase.execute(page, 10, freshUserId, filterUserId);

            if (isMounted.current) {
                if (fetchedVideos.length > 0) {
                    setVideos(prev => [...prev, ...fetchedVideos]);
                    setPage(prev => prev + 1);
                    setHasMore(fetchedVideos.length >= 10);

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
                    setHasMore(false);
                }
            }
        } catch (err) {
            logError(LogCode.FETCH_ERROR, 'Load more error', err);
        } finally {
            if (isMounted.current) {
                setIsLoadingMore(false);
            }
        }
    }, [isLoadingMore, hasMore, isLoading, page, getVideoFeedUseCase, filterUserId, syncSocialData]); // Removed currentUserId

    // Optimistic Update with Rollback
    const toggleLike = useCallback(async (videoId: string) => {
        if (!user) {
            Alert.alert('Giriş Yapmalısınız', 'Bu işlemi yapmak için giriş yapmalısınız.');
            return;
        }

        // Optimistic update
        setVideos((prevVideos) =>
            prevVideos.map((video) => {
                if (video.id === videoId) {
                    return {
                        ...video,
                        isLiked: !video.isLiked,
                        likesCount: video.isLiked
                            ? video.likesCount - 1
                            : video.likesCount + 1,
                    };
                }
                return video;
            })
        );

        try {
            const freshUserId = useAuthStore.getState().user?.id || 'anon';
            await toggleLikeUseCase.execute(videoId, freshUserId);
        } catch (err) {
            // Rollback on error
            logError(LogCode.DB_UPDATE, 'Toggle like failed, reverting', err);
            setVideos((prevVideos) =>
                prevVideos.map((video) => {
                    if (video.id === videoId) {
                        return {
                            ...video,
                            isLiked: !video.isLiked,
                            likesCount: video.isLiked
                                ? video.likesCount - 1
                                : video.likesCount + 1,
                        };
                    }
                    return video;
                })
            );
        }
    }, [toggleLikeUseCase, user]);

    const toggleSave = useCallback(async (videoId: string) => {
        if (!user) {
            Alert.alert('Giriş Yapmalısınız', 'Bu işlemi yapmak için giriş yapmalısınız.');
            return;
        }

        // Optimistic update
        setVideos((prevVideos) =>
            prevVideos.map((video) => {
                if (video.id === videoId) {
                    return {
                        ...video,
                        isSaved: !video.isSaved,
                        savesCount: video.isSaved
                            ? video.savesCount - 1
                            : video.savesCount + 1,
                    };
                }
                return video;
            })
        );

        try {
            const freshUserId = useAuthStore.getState().user?.id || 'anon';
            await toggleSaveUseCase.execute(videoId, freshUserId);
        } catch (err) {
            logError(LogCode.DB_UPDATE, 'Toggle save failed, reverting', err);
            // Rollback
            setVideos((prevVideos) =>
                prevVideos.map((video) => {
                    if (video.id === videoId) {
                        return {
                            ...video,
                            isSaved: !video.isSaved,
                            savesCount: video.isSaved
                                ? video.savesCount - 1
                                : video.savesCount + 1,
                        };
                    }
                    return video;
                })
            );
        }
    }, [toggleSaveUseCase, user]);

    // Sync local videos with global following state
    const syncedVideos = videos.map(v => ({
        ...v,
        user: {
            ...v.user,
            isFollowing: followingMap[v.user.id] ?? v.user.isFollowing
        }
    }));

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
        } catch (err) {
            // Error is handled in store
        }
    }, [videos, globalToggleFollow, user]);

    const toggleShare = useCallback((videoId: string) => {
        setVideos((prevVideos) =>
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
    }, []);

    const toggleShop = useCallback((videoId: string) => {
        setVideos((prevVideos) =>
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
    }, []);

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
        setVideos((prev) => prev.filter(v => v.id !== videoId));

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
        } catch (error: any) {
            logError(LogCode.DB_DELETE, 'Video delete failed, rolling back', error);
            // Rollback on failure
            setVideos(currentVideos);
            Alert.alert("Silme Başarısız", error.message || "Bilinmeyen hata");
        }
    }, [videos]);

    // 🔥 Prepend a newly uploaded video to the top of the feed
    const prependVideo = useCallback((newVideo: Video) => {
        setVideos(current => {
            // Prevent duplicates
            if (current.some(v => v.id === newVideo.id)) {
                logData(LogCode.REPO_SAVE, 'Video already exists, skipping prepend', { videoId: newVideo.id });
                return current;
            }
            logData(LogCode.REPO_SAVE, 'Prepending new video to feed', { videoId: newVideo.id });
            return [newVideo, ...current];
        });
    }, []);

    // 🔥 CRITICAL FIX: Only fetch once when auth is initialized
    // This prevents triple-fetch on mount (when userId changes from undefined -> anon -> real ID)
    useEffect(() => {
        // Guard: Wait for auth to be initialized
        if (!isInitialized) {
            logAuth(LogCode.AUTH_SESSION_CHECK, 'Waiting for auth initialization');
            return;
        }

        // Guard: Prevent duplicate initial fetch
        if (hasInitialFetch.current) {
            logSystem(LogCode.DEBUG_INFO, 'Initial fetch already done, skipping');
            return;
        }

        // Mark as fetched BEFORE making the call (prevents race condition)
        hasInitialFetch.current = true;
        logData(LogCode.FETCH_START, 'Starting initial feed fetch', { userId: currentUserId });
        fetchFeed();
    }, [isInitialized]); // Only depend on isInitialized, NOT on fetchFeed or currentUserId

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
