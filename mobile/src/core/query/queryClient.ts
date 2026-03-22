import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60, // 1 minute
            gcTime: 1000 * 60 * 5, // 5 minutes
            retry: 1,
            refetchOnWindowFocus: false, // Prevents excessive re-fetches in React Native
        },
    },
});

// Query Key Constants
export const QUERY_KEYS = {
    PROFILE: (userId: string) => ['profile', userId] as const,
    PROFILE_LITE: (userId: string) => ['profile', 'lite', userId] as const,
    STORIES: ['stories'] as const,
    SAVED_VIDEOS: (userId: string) => ['saved', userId] as const,
};
