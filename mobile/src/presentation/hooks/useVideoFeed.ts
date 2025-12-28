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
import { useActiveVideoStore } from '../store/useActiveVideoStore';
import { useAuthStore } from '../store/useAuthStore';

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
}

export function useVideoFeed(): UseVideoFeedReturn {
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
    const activeVideoId = useActiveVideoStore((state) => state.activeVideoId);

    // Auth User
    const { user } = useAuthStore();
    const currentUserId = user?.id || 'anon';

    // Initialize Cache
    useEffect(() => {
        VideoCacheService.initialize();
    }, []);

    // ... (keep prefetch logic) ...

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
            const fetchedVideos = await getVideoFeedUseCase.execute(1, 10, currentUserId);

            if (isMounted.current) {
                setVideos(fetchedVideos);
                setPage(2);
                setHasMore(fetchedVideos.length >= 10);
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
    }, [getVideoFeedUseCase, currentUserId]);

    const refreshFeed = useCallback(async () => {
        if (isRefreshing) return;

        try {
            setIsRefreshing(true);
            setError(null);
            // Clear cache on refresh to resolve any persistence issues with same-named files
            await VideoCacheService.clearCache();
            // Reset to page 1
            const fetchedVideos = await getVideoFeedUseCase.execute(1, 10, currentUserId);

            if (isMounted.current) {
                setVideos(fetchedVideos);
                setPage(2);
                setHasMore(fetchedVideos.length >= 10);
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
    }, [isRefreshing, getVideoFeedUseCase, currentUserId]);

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore || isLoading) return;

        try {
            setIsLoadingMore(true);
            const fetchedVideos = await getVideoFeedUseCase.execute(page, 10, currentUserId);

            if (isMounted.current) {
                if (fetchedVideos.length > 0) {
                    setVideos(prev => [...prev, ...fetchedVideos]);
                    setPage(prev => prev + 1);
                    setHasMore(fetchedVideos.length >= 10);
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
    }, [isLoadingMore, hasMore, isLoading, page, getVideoFeedUseCase, currentUserId]);

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
            await toggleLikeUseCase.execute(videoId, currentUserId);
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
    }, [toggleLikeUseCase, user, currentUserId]);

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
            await toggleSaveUseCase.execute(videoId, currentUserId);
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
    }, [toggleSaveUseCase, user, currentUserId]);

    const toggleFollow = useCallback(async (videoId: string) => {
        if (!user) {
            Alert.alert('Giriş Yapmalısınız', 'Bu işlemi yapmak için giriş yapmalısınız.');
            return;
        }

        const video = videos.find(v => v.id === videoId);
        if (!video) return;

        const userIdToFollow = video.user.id;

        // Optimistic update: Update ALL videos from this user
        setVideos((prevVideos) =>
            prevVideos.map((v) => {
                if (v.user.id === userIdToFollow) {
                    return {
                        ...v,
                        user: {
                            ...v.user,
                            isFollowing: !v.user.isFollowing,
                        },
                    };
                }
                return v;
            })
        );

        try {
            await toggleFollowUseCase.execute(userIdToFollow, currentUserId);
        } catch (err) {
            console.error('Toggle follow failed, reverting:', err);
            // Rollback: Revert ALL videos from this user
            setVideos((prevVideos) =>
                prevVideos.map((v) => {
                    if (v.user.id === userIdToFollow) {
                        return {
                            ...v,
                            user: {
                                ...v.user,
                                isFollowing: !v.user.isFollowing, // Revert back
                            },
                        };
                    }
                    return v;
                })
            );
        }
    }, [videos, toggleFollowUseCase, user, currentUserId]);

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
        // 1. Snapshot for rollback
        const previousVideos = [...videos];

        // 2. Optimistic Update
        setVideos((prev) => prev.filter(v => v.id !== videoId));

        try {
            const { CONFIG } = require('../../core/config');
            const response = await fetch(`${CONFIG.API_URL}/videos/${videoId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText || 'Sunucu hatası');
            }
            console.log('[useVideoFeed] Delete success:', videoId);
        } catch (error: any) {
            console.error('[useVideoFeed] Delete failed, rolling back:', error);
            // 3. Rollback on failure
            setVideos(previousVideos);
            // Re-throw to let UI handle alert if needed, or handle here
            // Alert here is better to ensure user sees it
            // But we need Alert import. Assuming it's not imported in hook usually.
            // Actually, index.tsx handles the UI part nicely? No, we want centralized logic.
            // So we MUST alert them if it fails.
            Alert.alert("Silme Başarısız", error.message || "Bilinmeyen hata");
        }
    }, [videos]);

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed]);

    return {
        videos,
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
    };
}
