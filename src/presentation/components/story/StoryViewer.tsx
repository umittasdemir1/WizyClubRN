import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Story } from '../../../domain/entities/Story';
import { StoryPage } from './StoryPage';
import { useRouter } from 'expo-router';
import PagerView from 'react-native-pager-view';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

interface StoryViewerProps {
    stories: Story[];
    initialIndex?: number;
}

export function StoryViewer({ stories, initialIndex = 0 }: StoryViewerProps) {
    const router = useRouter();
    const pagerRef = useRef<PagerView>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isPaused, setIsPaused] = useState(false);

    const handleNext = useCallback(() => {
        if (currentIndex < stories.length - 1) {
            pagerRef.current?.setPage(currentIndex + 1);
        } else {
            // Last story, close viewer
            router.back();
        }
    }, [currentIndex, stories.length, router]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            pagerRef.current?.setPage(currentIndex - 1);
        }
    }, [currentIndex]);

    const handleClose = useCallback(() => {
        router.back();
    }, [router]);

    const handlePauseToggle = useCallback((paused: boolean) => {
        setIsPaused(paused);
    }, []);

    const handlePageSelected = useCallback((e: any) => {
        setCurrentIndex(e.nativeEvent.position);
    }, []);

    return (
        <View style={styles.container}>
            <PagerView
                ref={pagerRef}
                style={styles.pager}
                initialPage={initialIndex}
                onPageSelected={handlePageSelected}
                orientation="horizontal"
                overdrag={false}
                scrollEnabled={true}
            >
                {stories.map((story, index) => (
                    <View key={story.id} style={styles.page}>
                        <StoryPage
                            story={story}
                            isActive={index === currentIndex}
                            isPaused={isPaused}
                            onNext={handleNext}
                            onPrev={handlePrev}
                            onClose={handleClose}
                            onPauseToggle={handlePauseToggle}
                            totalStories={stories.length}
                            currentStoryIndex={index}
                        />
                    </View>
                ))}
            </PagerView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#262730',
    },
    pager: {
        flex: 1,
    },
    page: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
});
