import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GetSavedVideosUseCase } from '../../domain/usecases/GetSavedVideosUseCase';
import { InteractionRepositoryImpl } from '../../data/repositories/InteractionRepositoryImpl';
import { VideoRepositoryImpl } from '../../data/repositories/VideoRepositoryImpl';
import { useResolvedVideoCounters } from './useResolvedVideoCounters';
import { useVideoCounterStore } from '../store/useVideoCounterStore';
import { logError, LogCode } from '@/core/services/Logger';
import { QUERY_KEYS } from '../../core/query/queryClient';

const interactionRepo = new InteractionRepositoryImpl();
const videoRepo = new VideoRepositoryImpl();
const getSavedVideosUseCase = new GetSavedVideosUseCase(interactionRepo, videoRepo);

export const useSavedVideos = (userId: string) => {
    const syncVideoCountersFromServer = useVideoCounterStore((state) => state.syncFromServer);

    const {
        data: videos = [],
        isLoading,
        error: queryError,
        refetch
    } = useQuery({
        queryKey: QUERY_KEYS.SAVED_VIDEOS(userId),
        queryFn: async () => {
            if (!userId) return [];
            try {
                const data = await getSavedVideosUseCase.execute(userId);
                // Sync to global store side-effect
                syncVideoCountersFromServer(data);
                return data;
            } catch (err) {
                logError(LogCode.REPO_ERROR, 'Error loading saved videos', { error: err, userId });
                throw err;
            }
        },
        enabled: Boolean(userId),
        staleTime: 1000 * 60, // 1 minute
    });

    const resolvedVideos = useResolvedVideoCounters(videos);

    const refresh = useCallback(() => refetch(), [refetch]);

    return {
        videos: resolvedVideos,
        isLoading,
        error: queryError ? 'Kaydedilen videolar yüklenirken bir hata oluştu' : null,
        refresh
    };
};
