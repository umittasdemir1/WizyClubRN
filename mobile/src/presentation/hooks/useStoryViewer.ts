import { useState, useEffect, useCallback } from 'react';
import { Story } from '../../domain/entities/Story';
import { GetStoriesUseCase } from '../../domain/usecases/GetStoriesUseCase';
import { StoryRepositoryImpl } from '../../data/repositories/StoryRepositoryImpl';
import { useRouter } from 'expo-router';

export function useStoryViewer(userId?: string) {
    const [stories, setStories] = useState<Story[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const storyRepository = new StoryRepositoryImpl();
    const getStoriesUseCase = new GetStoriesUseCase(storyRepository);

    useEffect(() => {
        const fetchStories = async () => {
            const allStories = await getStoriesUseCase.execute();

            // 🔥 FIX: Filter stories by user_id (Instagram-like behavior)
            // Only show stories from the clicked user
            const userStories = userId
                ? allStories.filter(s => s.user.id === userId)
                : allStories;

            console.log(`[StoryViewer] Loaded ${userStories.length} stories for user: ${userId}`);
            setStories(userStories);
            setCurrentIndex(0); // Always start from first story of that user
            setIsLoading(false);
        };
        fetchStories();
    }, [userId]);

    const goToNext = useCallback(() => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            router.back(); // Close modal if last story
        }
    }, [currentIndex, stories.length, router]);

    const goToPrev = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        } else {
            // Already at first story, do nothing or restart
            setCurrentIndex(0);
        }
    }, [currentIndex]);

    const currentStory = stories[currentIndex];

    return {
        stories,
        currentStory,
        currentIndex,
        isLoading,
        goToNext,
        goToPrev,
    };
}
