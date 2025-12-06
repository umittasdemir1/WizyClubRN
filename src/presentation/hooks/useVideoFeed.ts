import { useEffect, useState, useCallback } from 'react';
import { Video } from '../../domain/entities/Video';
import { GetVideoFeedUseCase } from '../../domain/usecases/GetVideoFeedUseCase';
import { ToggleLikeUseCase } from '../../domain/usecases/ToggleLikeUseCase';
import { VideoRepositoryImpl } from '../../data/repositories/VideoRepositoryImpl';

export function useVideoFeed() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Dependency Injection (Manual for now)
    const videoRepository = new VideoRepositoryImpl();
    const getVideoFeedUseCase = new GetVideoFeedUseCase(videoRepository);
    const toggleLikeUseCase = new ToggleLikeUseCase(videoRepository);

    const fetchFeed = useCallback(async () => {
        try {
            setIsLoading(true);
            const fetchedVideos = await getVideoFeedUseCase.execute();
            setVideos(fetchedVideos);
        } catch (err) {
            setError('Failed to fetch video feed');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const toggleLike = useCallback(async (videoId: string) => {
        // Optimistic update
        setVideos((prevVideos) =>
            prevVideos.map((video) => {
                if (video.id === videoId) {
                    return {
                        ...video,
                        isLiked: !video.isLiked,
                        likesCount: video.isLiked ? video.likesCount - 1 : video.likesCount + 1,
                    };
                }
                return video;
            })
        );

        try {
            await toggleLikeUseCase.execute(videoId);
        } catch (err) {
            // Revert if failed
            console.error('Failed to toggle like', err);
            // We could revert state here, but for now let's keep it simple
        }
    }, []);

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed]);

    return {
        videos,
        isLoading,
        error,
        fetchFeed,
        toggleLike,
    };
}
