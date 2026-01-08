import { useState, useCallback, useEffect } from 'react';
import { Video } from '../../domain/entities/Video';
import { GetSavedVideosUseCase } from '../../domain/usecases/GetSavedVideosUseCase';
import { InteractionRepositoryImpl } from '../../data/repositories/InteractionRepositoryImpl';
import { VideoRepositoryImpl } from '../../data/repositories/VideoRepositoryImpl';

const interactionRepo = new InteractionRepositoryImpl();
const videoRepo = new VideoRepositoryImpl();
const getSavedVideosUseCase = new GetSavedVideosUseCase(interactionRepo, videoRepo);

export const useSavedVideos = (userId: string) => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSavedVideos = useCallback(async (silent = false) => {
        if (!userId) return;

        if (!silent) setIsLoading(true);
        try {
            const data = await getSavedVideosUseCase.execute(userId);
            setVideos(data);
            setError(null);
        } catch (err) {
            console.error('[useSavedVideos] Error:', err);
            setError('Kaydedilen videolar yüklenirken bir hata oluştu');
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchSavedVideos();
    }, [fetchSavedVideos]);

    return {
        videos,
        isLoading,
        error,
        refresh: () => fetchSavedVideos(true)
    };
};
