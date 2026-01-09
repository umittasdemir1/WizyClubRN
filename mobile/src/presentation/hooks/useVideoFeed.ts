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
import { Image } from 'expo-image';
import { useActiveVideoStore } from '../store/useActiveVideoStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSocialStore } from '../store/useSocialStore';

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
    const activeVideoId = useActiveVideoStore((state) => state.activeVideoId);

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
    }, []);

    // ============================================
    // PREFETCH MECHANISM (TikTok-style)
    // ============================================

    // 1. Initial Prefetch: When feed loads, prefetch first 3 videos
    const hasInitialPrefetched = useRef(false);
    useEffect(() => {
        if (videos.length > 0 && !hasInitialPrefetched.current) {
            hasInitialPrefetched.current = true;
            console.log('[Prefetch] 🚀 Initial prefetch starting...');

            videos.slice(0, 3).forEach((v, i) => {
                // Video prefetch (background download)
                VideoCacheService.cacheVideo(v.videoUrl).then(path => {
                    if (path) console.log(`[Prefetch] ✅ Video ${i + 1} cached`);
                });
                // Thumbnail prefetch (for instant display)
                if (v.thumbnailUrl) {
                    Image.prefetch(v.thumbnailUrl);
                }
            });
        }
    }, [videos.length]); // Fixed: Use videos.length instead of boolean expression

    // 2. Scroll Prefetch: When user scrolls to new video, prefetch next 3 videos
    const lastPrefetchedIndex = useRef(-1);
    useEffect(() => {
        if (!activeVideoId || videos.length === 0) return;

        const currentIndex = videos.findIndex(v => v.id === activeVideoId);
        if (currentIndex === -1 || currentIndex === lastPrefetchedIndex.current) return;

        // Skip prefetch if we're still on initial videos (index 0-2) to avoid overlap
        // Initial prefetch already handled first 3 videos
        if (currentIndex < 2) {
            lastPrefetchedIndex.current = currentIndex;
            return;
        }

        lastPrefetchedIndex.current = currentIndex;

        // Prefetch next 3 videos (if they exist)
        const nextVideos = videos.slice(currentIndex + 1, currentIndex + 4);
        if (nextVideos.length > 0) {
            // Silently prefetch without spam (user doesn't need to see this)
            nextVideos.forEach((v) => {
                VideoCacheService.cacheVideo(v.videoUrl);
                if (v.thumbnailUrl) {
                    Image.prefetch(v.thumbnailUrl);
                }
            });
        }
    }, [activeVideoId, videos]);

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
                console.error('Feed fetch error:', err);
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
                console.error('Refresh error:', err);
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
            console.error('Load more error:', err);
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
            console.error('Toggle like failed, reverting:', err);
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
            console.error('Toggle save failed, reverting:', err);
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
            console.log(`[Delete] 🎯 Switching to next video: ${nextActiveId} (index ${nextActiveIndex})`);
            setActiveVideo(nextActiveId, nextActiveIndex);
        }

        // 4. Optimistic Update - Remove from list
        setVideos((prev) => prev.filter(v => v.id !== videoId));

        // 5. Network call (background) with JWT authentication for HARD DELETE
        try {
            const { CONFIG } = require('../../core/config');
            const authState = useAuthStore.getState();
            const token = authState.session?.access_token;
            console.log(`[Delete] 🔑 Auth State Debug:`, {
                hasSession: !!authState.session,
                hasUser: !!authState.user,
                hasToken: !!token,
                tokenPreview: token ? token.substring(0, 30) + '...' : 'NULL'
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
            console.log('[useVideoFeed] Delete success:', videoId);
        } catch (error: any) {
            console.error('[useVideoFeed] Delete failed, rolling back:', error);
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
                console.log('[useVideoFeed] Video already exists, skipping prepend:', newVideo.id);
                return current;
            }
            console.log('[useVideoFeed] Prepending new video:', newVideo.id);
            return [newVideo, ...current];
        });
    }, []);

    // 🔥 CRITICAL FIX: Only fetch once when auth is initialized
    // This prevents triple-fetch on mount (when userId changes from undefined -> anon -> real ID)
    useEffect(() => {
        // Guard: Wait for auth to be initialized
        if (!isInitialized) {
            console.log('[useVideoFeed] ⏸️  Waiting for auth initialization...');
            return;
        }

        // Guard: Prevent duplicate initial fetch
        if (hasInitialFetch.current) {
            console.log('[useVideoFeed] ✋ Initial fetch already done, skipping');
            return;
        }

        // Mark as fetched BEFORE making the call (prevents race condition)
        hasInitialFetch.current = true;
        console.log('[useVideoFeed] 🚀 Starting initial fetch with userId:', currentUserId);
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
