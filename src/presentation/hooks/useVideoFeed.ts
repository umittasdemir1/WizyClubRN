import { useEffect, useState, useCallback, useRef } from 'react';
import { Video } from '../../domain/entities/Video';
import { GetVideoFeedUseCase } from '../../domain/usecases/GetVideoFeedUseCase';
import { ToggleLikeUseCase } from '../../domain/usecases/ToggleLikeUseCase';
import { VideoRepositoryImpl } from '../../data/repositories/VideoRepositoryImpl';
import { VideoCacheService } from '../../data/services/VideoCacheService';
import { useActiveVideoStore } from '../store/useActiveVideoStore';

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
    toggleSave: (videoId: string) => void;
    toggleFollow: (videoId: string) => void;
    toggleShare: (videoId: string) => void;
    toggleShop: (videoId: string) => void;
    removeVideo: (videoId: string) => void; // Added
}

export function useVideoFeed(): UseVideoFeedReturn {
    // Repository & UseCases (Memoized to prevent recreation)
    const videoRepository = useRef(new VideoRepositoryImpl()).current;
    const getVideoFeedUseCase = useRef(new GetVideoFeedUseCase(videoRepository)).current;
    const toggleLikeUseCase = useRef(new ToggleLikeUseCase(videoRepository)).current;

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

    // Initialize Cache
    useEffect(() => {
        VideoCacheService.initialize();
    }, []);

    // Prefetching Logic
    useEffect(() => {
        if (!activeVideoId || videos.length === 0) return;

        const currentIndex = videos.findIndex(v => v.id === activeVideoId);
        if (currentIndex === -1) return;

        // Prefetch next 3 videos
        const videosToPrefetch = videos.slice(currentIndex + 1, currentIndex + 4);

        videosToPrefetch.forEach(video => {
            if (typeof video.videoUrl === 'string') {
                VideoCacheService.cacheVideo(video.videoUrl);
            }
        });
    }, [activeVideoId, videos]);

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
            const fetchedVideos = await getVideoFeedUseCase.execute(1, 10);

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
    }, [getVideoFeedUseCase]);

    const refreshFeed = useCallback(async () => {
        if (isRefreshing) return;

        try {
            setIsRefreshing(true);
            setError(null);
            // Reset to page 1
            const fetchedVideos = await getVideoFeedUseCase.execute(1, 10);

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
    }, [isRefreshing, getVideoFeedUseCase]);

    const loadMore = useCallback(async () => {
        if (isLoadingMore || !hasMore || isLoading) return;

        try {
            setIsLoadingMore(true);
            const fetchedVideos = await getVideoFeedUseCase.execute(page, 10);

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
    }, [isLoadingMore, hasMore, isLoading, page, getVideoFeedUseCase]);

    // Optimistic Update with Rollback
    const toggleLike = useCallback(async (videoId: string) => {
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
            await toggleLikeUseCase.execute(videoId);
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
    }, [toggleLikeUseCase]);

    const toggleSave = useCallback((videoId: string) => {
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
    }, []);

    const toggleFollow = useCallback((videoId: string) => {
        setVideos((prevVideos) =>
            prevVideos.map((video) => {
                if (video.id === videoId) {
                    return {
                        ...video,
                        user: {
                            ...video.user,
                            isFollowing: !video.user.isFollowing,
                        },
                    };
                }
                return video;
            })
        );
    }, []);

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

    const removeVideo = useCallback((videoId: string) => {
        setVideos((prevVideos) => prevVideos.filter(v => v.id !== videoId));
    }, []);

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
        removeVideo, // Exported
    };
}
