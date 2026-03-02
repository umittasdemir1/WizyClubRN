import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Story } from '../../domain/entities/Story';
import { GetStoriesUseCase } from '../../domain/usecases/GetStoriesUseCase';
import { StoryRepositoryImpl } from '../../data/repositories/StoryRepositoryImpl';
import { StoryRealtimeEvent, StoryRealtimeService } from '../../data/services/StoryRealtimeService';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStoryStore } from '../store/useStoryStore';
import { useAuthStore } from '../store/useAuthStore';
import { queryClient, QUERY_KEYS } from '../../core/query/queryClient';

const storyRepository = new StoryRepositoryImpl();
const getStoriesUseCase = new GetStoriesUseCase(storyRepository);
const storyRealtimeService = new StoryRealtimeService();

const sortStories = (stories: Story[]) =>
    [...stories].sort((a, b) => {
        const createdAtDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (createdAtDiff !== 0) return createdAtDiff;
        return b.id.localeCompare(a.id);
    });

const upsertStory = (stories: Story[], nextStory: Story): Story[] => {
    const filtered = stories.filter((story) => story.id !== nextStory.id);
    return sortStories([...filtered, nextStory]);
};

/**
 * Unified Story Hook
 * Replaces useStoryViewer, useInfiniteStoryViewer, and usePoolStoryViewer.
 * 
 * @param userId Optional user ID to focus on specific stories.
 * @param mode Optional mode for specific behavior tuning (if needed in future).
 */
export function useStories(userId?: string, _mode?: 'default' | 'infinite' | 'pool') {
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

    const applyStoryRealtimeEvent = useCallback((event: StoryRealtimeEvent) => {
        const eventStory = (event.new || event.old || {}) as { id?: unknown; deleted_at?: unknown; expires_at?: unknown };
        const storyId = typeof eventStory.id === 'string' ? eventStory.id : null;

        if (!storyId) {
            void queryClient.invalidateQueries({ queryKey: storiesQueryKey });
            return;
        }

        const isRemovalEvent = event.eventType === 'DELETE'
            || eventStory.deleted_at != null
            || (typeof eventStory.expires_at === 'string' && new Date(eventStory.expires_at).getTime() <= Date.now());

        if (isRemovalEvent) {
            queryClient.setQueryData(storiesQueryKey, (existing: Story[] = []) =>
                existing.filter((story) => story.id !== storyId)
            );
            return;
        }

        void (async () => {
            const nextStory = await storyRepository.getStoryById(storyId, currentUser?.id);

            queryClient.setQueryData(storiesQueryKey, (existing: Story[] = []) => {
                const currentStories = Array.isArray(existing) ? existing : [];
                if (!nextStory) {
                    return currentStories.filter((story) => story.id !== storyId);
                }
                return upsertStory(currentStories, nextStory);
            });
        })();
    }, [currentUser?.id, storiesQueryKey]);

    // Realtime updates now use a shared channel and patch the cache instead of full-list invalidation on every event.
    useEffect(() => {
        return storyRealtimeService.subscribe(applyStoryRealtimeEvent);
    }, [applyStoryRealtimeEvent]);

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
    useEffect(() => {
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
