import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Story } from '../../domain/entities/Story';
import { GetStoriesUseCase } from '../../domain/usecases/GetStoriesUseCase';
import { StoryRepositoryImpl } from '../../data/repositories/StoryRepositoryImpl';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStoryStore } from '../store/useStoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../../core/supabase';
import { queryClient, QUERY_KEYS } from '../../core/query/queryClient';

const storyRepository = new StoryRepositoryImpl();
const getStoriesUseCase = new GetStoriesUseCase(storyRepository);

/**
 * Unified Story Hook
 * Replaces useStoryViewer, useInfiniteStoryViewer, and usePoolStoryViewer.
 * 
 * @param userId Optional user ID to focus on specific stories.
 * @param mode Optional mode for specific behavior tuning (if needed in future).
 */
export function useStories(userId?: string, mode?: 'default' | 'infinite' | 'pool') {
    const [currentIndex, setCurrentIndex] = useState(0);
    const router = useRouter();
    const { initial } = useLocalSearchParams<{ initial?: string }>();

    const refreshTrigger = useStoryStore(state => state.refreshTrigger);
    const viewedUserIds = useStoryStore(state => state.viewedUserIds);
    const currentUser = useAuthStore(state => state.user);
    const storiesQueryKey = useMemo(
        () => [...QUERY_KEYS.STORIES, currentUser?.id || 'anon'] as const,
        [currentUser?.id]
    );

    const {
        data: allStories = [],
        isLoading: isStoriesLoading,
        error
    } = useQuery({
        queryKey: storiesQueryKey,
        queryFn: () => getStoriesUseCase.execute(currentUser?.id),
        staleTime: 1000 * 30, // 30 seconds
    });

    // Manual refresh trigger (used by upload/delete flows)
    useEffect(() => {
        if (refreshTrigger <= 0) return;
        void queryClient.invalidateQueries({ queryKey: storiesQueryKey });
    }, [refreshTrigger, storiesQueryKey]);

    // Realtime updates so story ring reacts instantly to insert/delete/update.
    useEffect(() => {
        const channel = supabase
            .channel(`stories-realtime-${mode || 'default'}-${currentUser?.id || 'anon'}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'stories' },
                () => {
                    void queryClient.invalidateQueries({ queryKey: storiesQueryKey });
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [currentUser?.id, mode, storiesQueryKey]);

    // Derived Data: Sorted and Grouped Users
    const { sortedUsers, usersMap } = useMemo(() => {
        const map = new Map<string, { id: string, hasUnseen: boolean, stories: Story[] }>();

        allStories.forEach(story => {
            if (!map.has(story.user.id)) {
                map.set(story.user.id, {
                    id: story.user.id,
                    hasUnseen: false,
                    stories: []
                });
            }
            const userEntry = map.get(story.user.id)!;
            userEntry.stories.push(story);

            const isLocallyViewed = viewedUserIds.has(story.user.id);

            // Logic to determine if user has unseen stories
            if (userId && story.user.id === userId) {
                if (!story.isViewed) {
                    userEntry.hasUnseen = true;
                }
            } else {
                if (!isLocallyViewed && !story.isViewed) {
                    userEntry.hasUnseen = true;
                }
            }
        });

        const sorted = Array.from(map.values()).sort((a, b) => {
            if (a.hasUnseen && !b.hasUnseen) return -1;
            if (!a.hasUnseen && b.hasUnseen) return 1;
            return 0;
        });

        return { sortedUsers: sorted, usersMap: map };
    }, [allStories, viewedUserIds, userId]);

    // Navigation State
    const { stories, nextUserId, prevUserId } = useMemo(() => {
        if (!userId) {
            return { stories: allStories, nextUserId: null, prevUserId: null };
        }

        const currentUserIndex = sortedUsers.findIndex(u => u.id === userId);
        const userStories = usersMap.get(userId)?.stories || [];

        return {
            stories: userStories,
            nextUserId: (currentUserIndex !== -1 && currentUserIndex < sortedUsers.length - 1)
                ? sortedUsers[currentUserIndex + 1].id
                : null,
            prevUserId: (currentUserIndex > 0)
                ? sortedUsers[currentUserIndex - 1].id
                : null,
        };
    }, [userId, allStories, sortedUsers, usersMap]);

    // Update currentIndex on initial move
    useMemo(() => {
        if (userId && initial === 'last' && stories.length > 0) {
            setCurrentIndex(stories.length - 1);
        } else if (userId) {
            setCurrentIndex(0);
        }
    }, [userId, initial, stories.length]);

    const goToNext = useCallback(() => {
        if (nextUserId) {
            router.replace(`/story/${nextUserId}`);
        } else {
            router.back();
        }
    }, [router, nextUserId]);

    const goToPrev = useCallback(() => {
        if (prevUserId) {
            router.replace(`/story/${prevUserId}?initial=last`);
        } else {
            router.back();
        }
    }, [router, prevUserId]);

    const currentStory = stories[currentIndex] || null;

    return {
        stories,
        currentStory,
        currentIndex,
        setCurrentIndex,
        isLoading: isStoriesLoading,
        goToNext,
        goToPrev,
        nextUserId,
        prevUserId,
        error
    };
}
