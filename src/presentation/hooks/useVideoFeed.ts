import { useEffect, useState, useCallback, useRef } from 'react';
import { Video } from '../../domain/entities/Video';
import { GetVideoFeedUseCase } from '../../domain/usecases/GetVideoFeedUseCase';
import { ToggleLikeUseCase } from '../../domain/usecases/ToggleLikeUseCase';
import { VideoRepositoryImpl } from '../../data/repositories/VideoRepositoryImpl';

// 🚀 SINGLETON PATTERN: Her render'da yeni instance oluşmasını engeller
const videoRepository = new VideoRepositoryImpl();
const getVideoFeedUseCase = new GetVideoFeedUseCase(videoRepository);
const toggleLikeUseCase = new ToggleLikeUseCase(videoRepository);

interface UseVideoFeedReturn {
    videos: Video[];
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;
    fetchFeed: () => Promise<void>;
    refreshFeed: () => Promise<void>;
    toggleLike: (videoId: string) => Promise<void>;
    toggleSave: (videoId: string) => void;
    toggleFollow: (videoId: string) => void;
    toggleShare: (videoId: string) => void;
    toggleShop: (videoId: string) => void;
}

export function useVideoFeed(): UseVideoFeedReturn {
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isMounted = useRef(true);

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
            const fetchedVideos = await getVideoFeedUseCase.execute();

            if (isMounted.current) {
                setVideos(fetchedVideos);
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
    }, []);

    const refreshFeed = useCallback(async () => {
        if (isRefreshing) return;

        try {
            setIsRefreshing(true);
            setError(null);
            const fetchedVideos = await getVideoFeedUseCase.execute();

            if (isMounted.current) {
                setVideos(fetchedVideos);
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
    }, [isRefreshing]);

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
    }, []);

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

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed]);

    return {
        videos,
        isLoading,
        isRefreshing,
        error,
        fetchFeed,
        refreshFeed,
        toggleLike,
        toggleSave,
        toggleFollow,
        toggleShare,
        toggleShop,
    };
}
