import { useCallback, useRef, useState } from 'react';
import { Video } from '../../domain/entities/Video';
import { VideoRepositoryImpl } from '../../data/repositories/VideoRepositoryImpl';
import { SearchVideosUseCase } from '../../domain/usecases/SearchVideosUseCase';
import { useAuthStore } from '../store/useAuthStore';
import { useVideoCounterStore } from '../store/useVideoCounterStore';
import { useResolvedVideoCounters } from './useResolvedVideoCounters';
import { logError, LogCode } from '@/core/services/Logger';

export function useVideoSearch(limit: number = 20) {
    const [results, setResults] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestIdRef = useRef(0);
    const videoRepository = useRef(new VideoRepositoryImpl()).current;
    const searchUseCase = useRef(new SearchVideosUseCase(new VideoRepositoryImpl())).current;
    const syncVideoCountersFromServer = useVideoCounterStore((state) => state.syncFromServer);

    const search = useCallback(async (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) {
            setResults([]);
            setError(null);
            setIsLoading(false);
            return;
        }

        const requestId = ++requestIdRef.current;
        setIsLoading(true);
        setError(null);

        try {
            const userId = useAuthStore.getState().user?.id;
            const data = await searchUseCase.execute(trimmed, limit, userId);
            if (requestId !== requestIdRef.current) return;
            syncVideoCountersFromServer(data);
            setResults(data);
        } catch (err) {
            logError(LogCode.REPO_ERROR, 'Video search failed', { error: err, query: trimmed });
            if (requestId !== requestIdRef.current) return;
            setError('Arama sırasında bir hata oluştu.');
        } finally {
            if (requestId === requestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [limit, searchUseCase, syncVideoCountersFromServer]);

    const searchByLocation = useCallback(async (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) {
            setResults([]);
            setError(null);
            setIsLoading(false);
            return;
        }

        const requestId = ++requestIdRef.current;
        setIsLoading(true);
        setError(null);

        try {
            const userId = useAuthStore.getState().user?.id;
            const data = await videoRepository.searchVideosByLocation(trimmed, limit, userId);
            if (requestId !== requestIdRef.current) return;
            syncVideoCountersFromServer(data);
            setResults(data);
        } catch (err) {
            logError(LogCode.REPO_ERROR, 'Location video search failed', { error: err, query: trimmed });
            if (requestId !== requestIdRef.current) return;
            setError('Arama sırasında bir hata oluştu.');
        } finally {
            if (requestId === requestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [limit, syncVideoCountersFromServer, videoRepository]);

    const clear = useCallback(() => {
        requestIdRef.current += 1;
        setResults([]);
        setError(null);
        setIsLoading(false);
    }, []);

    const resolvedResults = useResolvedVideoCounters(results);

    return {
        results: resolvedResults,
        isLoading,
        error,
        search,
        searchByLocation,
        clear,
    };
}
