import { useState, useEffect, useCallback } from 'react';
import { Story } from '../../domain/entities/Story';
import { GetStoriesUseCase } from '../../domain/usecases/GetStoriesUseCase';
import { StoryRepositoryImpl } from '../../data/repositories/StoryRepositoryImpl';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStoryStore } from '../store/useStoryStore';
import { useAuthStore } from '../store/useAuthStore';

export function useStoryViewer(userId?: string) {
    const [stories, setStories] = useState<Story[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [nextUserId, setNextUserId] = useState<string | null>(null);
    const [prevUserId, setPrevUserId] = useState<string | null>(null);
    const router = useRouter();
    const { initial } = useLocalSearchParams<{ initial?: string }>();

    const refreshTrigger = useStoryStore(state => state.refreshTrigger);
    const viewedUserIds = useStoryStore(state => state.viewedUserIds);
    const currentUser = useAuthStore(state => state.user);

    const storyRepository = new StoryRepositoryImpl();
    const getStoriesUseCase = new GetStoriesUseCase(storyRepository);

    useEffect(() => {
        const fetchStories = async () => {
            const allStories = await getStoriesUseCase.execute();

            // Group by user
            const usersMap = new Map<string, { id: string, hasUnseen: boolean, stories: Story[] }>();
            
            allStories.forEach(story => {
                if (!usersMap.has(story.user.id)) {
                    usersMap.set(story.user.id, { 
                        id: story.user.id, 
                        hasUnseen: false, 
                        stories: [] 
                    });
                }
                const userEntry = usersMap.get(story.user.id)!;
                userEntry.stories.push(story);
                
                const isLocallyViewed = viewedUserIds.has(story.user.id);
                
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

            const sortedUsers = Array.from(usersMap.values()).sort((a, b) => {
                if (a.hasUnseen && !b.hasUnseen) return -1;
                if (!a.hasUnseen && b.hasUnseen) return 1;
                return 0;
            });

            // Find current, next, and prev user
            if (userId) {
                const currentUserIndex = sortedUsers.findIndex(u => u.id === userId);
                
                // Next User
                if (currentUserIndex !== -1 && currentUserIndex < sortedUsers.length - 1) {
                    setNextUserId(sortedUsers[currentUserIndex + 1].id);
                } else {
                    setNextUserId(null);
                }

                // Prev User
                if (currentUserIndex > 0) {
                    setPrevUserId(sortedUsers[currentUserIndex - 1].id);
                } else {
                    setPrevUserId(null);
                }

                // Set stories for current user
                const userStories = usersMap.get(userId)?.stories || [];
                console.log(`[StoryViewer] Loaded ${userStories.length} stories for user: ${userId}`);
                setStories(userStories);

                // Handle initial index (e.g. starting from last story when swiping back)
                if (initial === 'last' && userStories.length > 0) {
                    setCurrentIndex(userStories.length - 1);
                } else {
                    setCurrentIndex(0);
                }
            } else {
                setStories(allStories);
                setCurrentIndex(0);
            }
            
            setIsLoading(false);
        };
        fetchStories();
    }, [userId, refreshTrigger, viewedUserIds, initial, currentUser?.id]);

    const goToNext = useCallback(() => {
        if (nextUserId) {
            router.replace(`/story/${nextUserId}`);
        } else {
            router.back();
        }
    }, [router, nextUserId]);

    const goToPrev = useCallback(() => {
        if (prevUserId) {
            // Go to previous user, starting at their LAST story
            router.replace(`/story/${prevUserId}?initial=last`);
        } else {
            router.back();
        }
    }, [router, prevUserId]);

    const currentStory = stories[currentIndex];

    return {
        stories,
        currentStory,
        currentIndex,
        isLoading,
        goToNext,
        goToPrev,
        nextUserId,
        prevUserId
    };
}
