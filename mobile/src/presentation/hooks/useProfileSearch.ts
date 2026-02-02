import { useCallback, useRef, useState } from 'react';
import { User } from '../../domain/entities';
import { ProfileRepositoryImpl } from '../../data/repositories/ProfileRepositoryImpl';
import { SearchProfilesUseCase } from '../../domain/usecases/SearchProfilesUseCase';
import { useAuthStore } from '../store/useAuthStore';
import { logError, LogCode } from '@/core/services/Logger';

export function useProfileSearch(limit: number = 20) {
    const [results, setResults] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const requestIdRef = useRef(0);
    const searchUseCase = useRef(new SearchProfilesUseCase(new ProfileRepositoryImpl())).current;

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
            const viewerId = useAuthStore.getState().user?.id;
            const data = await searchUseCase.execute(trimmed, limit, viewerId);
            if (requestId !== requestIdRef.current) return;
            setResults(data);
        } catch (err) {
            logError(LogCode.REPO_ERROR, 'Profile search failed', { error: err, query: trimmed });
            if (requestId !== requestIdRef.current) return;
            setError('Arama sırasında bir hata oluştu.');
        } finally {
            if (requestId === requestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, [limit, searchUseCase]);

    const clear = useCallback(() => {
        requestIdRef.current += 1;
        setResults([]);
        setError(null);
        setIsLoading(false);
    }, []);

    return {
        results,
        isLoading,
        error,
        search,
        clear,
    };
}
