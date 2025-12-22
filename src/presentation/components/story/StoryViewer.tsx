import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, ViewToken } from 'react-native';
import { Story } from '../../../domain/entities/Story';
import { StoryPage } from './StoryPage';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StoryViewerProps {
    stories: Story[];
    initialIndex?: number;
}

export function StoryViewer({ stories, initialIndex = 0 }: StoryViewerProps) {
    const router = useRouter();
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isPaused, setIsPaused] = useState(false);

    // Scroll to initial story
    useEffect(() => {
        if (initialIndex > 0 && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
        }
    }, [initialIndex]);

    const handleViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            const index = viewableItems[0].index;
            if (index !== null && index !== undefined) {
                setCurrentIndex(index);
            }
        }
    }, []);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    });

    const handleNext = useCallback(() => {
        if (currentIndex < stories.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
        } else {
            // Last story, close viewer
            router.back();
        }
    }, [currentIndex, stories.length, router]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
        }
    }, [currentIndex]);

    const handleClose = useCallback(() => {
        router.back();
    }, [router]);

    const handlePauseToggle = useCallback((paused: boolean) => {
        setIsPaused(paused);
    }, []);

    const renderStory = useCallback(({ item, index }: { item: Story; index: number }) => {
        const isActive = index === currentIndex;

        return (
            <View style={styles.storyContainer}>
                <StoryPage
                    story={item}
                    isActive={isActive}
                    isPaused={isPaused}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    onClose={handleClose}
                    onPauseToggle={handlePauseToggle}
                    totalStories={stories.length}
                    currentStoryIndex={index}
                />
            </View>
        );
    }, [currentIndex, isPaused, handleNext, handlePrev, handleClose, handlePauseToggle, stories.length]);

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={stories}
                renderItem={renderStory}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEnabled={true}
                onViewableItemsChanged={handleViewableItemsChanged}
                viewabilityConfig={viewabilityConfig.current}
                getItemLayout={(data, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                })}
                initialScrollIndex={initialIndex}
                windowSize={3}
                maxToRenderPerBatch={2}
                removeClippedSubviews={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    storyContainer: {
        width: SCREEN_WIDTH,
        flex: 1,
    },
});
