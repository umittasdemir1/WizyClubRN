import { useState, useEffect, useCallback } from 'react';
import { Story } from '../../domain/entities/Story';
import { GetStoriesUseCase } from '../../domain/usecases/GetStoriesUseCase';
import { StoryRepositoryImpl } from '../../data/repositories/StoryRepositoryImpl';
import { useRouter } from 'expo-router';

export function useStoryViewer(initialStoryId?: string) {
    const [stories, setStories] = useState<Story[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const storyRepository = new StoryRepositoryImpl();
    const getStoriesUseCase = new GetStoriesUseCase(storyRepository);

    useEffect(() => {
        const fetchStories = async () => {
            const fetchedStories = await getStoriesUseCase.execute();
            setStories(fetchedStories);

            if (initialStoryId) {
                const index = fetchedStories.findIndex(s => s.id === initialStoryId);
                if (index !== -1) setCurrentIndex(index);
            }

            setIsLoading(false);
        };
        fetchStories();
    }, [initialStoryId]);

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
            // Restart story or close? Usually restart or do nothing.
            // Let's restart the current one or go back to previous user's story if we had that logic.
            // For now, just restart.
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
