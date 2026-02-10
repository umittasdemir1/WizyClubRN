import { useState, useCallback, useEffect } from 'react';
import { Video } from '../../domain/entities/Video';
import { GetSavedVideosUseCase } from '../../domain/usecases/GetSavedVideosUseCase';
import { InteractionRepositoryImpl } from '../../data/repositories/InteractionRepositoryImpl';
import { VideoRepositoryImpl } from '../../data/repositories/VideoRepositoryImpl';
import { useResolvedVideoCounters } from './useResolvedVideoCounters';
import { useVideoCounterStore } from '../store/useVideoCounterStore';
import { logRepo, logError, LogCode } from '@/core/services/Logger';

const interactionRepo = new InteractionRepositoryImpl();
const videoRepo = new VideoRepositoryImpl();
const getSavedVideosUseCase = new GetSavedVideosUseCase(interactionRepo, videoRepo);

export const useSavedVideos = (userId: string) => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const syncVideoCountersFromServer = useVideoCounterStore((state) => state.syncFromServer);

    const fetchSavedVideos = useCallback(async (silent = false) => {
        if (!userId) return;

        if (!silent) setIsLoading(true);
        try {
            const data = await getSavedVideosUseCase.execute(userId);
            syncVideoCountersFromServer(data);
            setVideos(data);
            setError(null);
        } catch (err) {
            logError(LogCode.REPO_ERROR, 'Error loading saved videos', { error: err, userId });
            setError('Kaydedilen videolar yüklenirken bir hata oluştu');
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [syncVideoCountersFromServer, userId]);

    useEffect(() => {
        fetchSavedVideos();
    }, [fetchSavedVideos]);

    const resolvedVideos = useResolvedVideoCounters(videos);

    return {
        videos: resolvedVideos,
        isLoading,
        error,
        refresh: () => fetchSavedVideos(true)
    };
};
