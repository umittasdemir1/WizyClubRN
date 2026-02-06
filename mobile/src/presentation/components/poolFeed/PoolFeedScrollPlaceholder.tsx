/**
 * PoolFeedScrollPlaceholder - Feed Item Placeholder Component
 *
 * Minimal, transparent placeholder for FlashList items.
 * Handles carousel and regular video tap interactions.
 *
 * @module presentation/components/feed/PoolFeedScrollPlaceholder
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video } from '../../../domain/entities/Video';
import { PoolFeedCarouselLayer } from './PoolFeedCarouselLayer';
import { PoolFeedDoubleTapLike } from './PoolFeedDoubleTapLike';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_HEIGHT = Dimensions.get('window').height;

// ============================================================================
// Types
// ============================================================================

interface PoolFeedScrollPlaceholderProps {
    video: Video;
    isActive: boolean;
    isCleanScreen: boolean;
    onDoubleTap: (videoId: string) => void;
    onSingleTap: () => void;
    onLongPress: (event: any) => void;
    onPressIn: (event: any) => void;
    onPressOut: () => void;
    onCarouselTouchStart?: () => void;
    onCarouselTouchEnd?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const PoolFeedScrollPlaceholder = React.memo(function PoolFeedScrollPlaceholder({
    video,
    isActive,
    isCleanScreen,
    onDoubleTap,
    onSingleTap,
    onLongPress,
    onPressIn,
    onPressOut,
    onCarouselTouchStart,
    onCarouselTouchEnd,
}: PoolFeedScrollPlaceholderProps) {
    const isCarousel = video.postType === 'carousel' && (video.mediaUrls?.length ?? 0) > 0;

    if (isActive && isCarousel) {
        return (
            <View style={styles.placeholderContainer}>
                <PoolFeedCarouselLayer
                    mediaUrls={video.mediaUrls ?? []}
                    isCleanScreen={isCleanScreen}
                    onDoubleTap={() => onDoubleTap(video.id)}
                    onSingleTap={onSingleTap}
                    onLongPress={onLongPress}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    onCarouselTouchStart={onCarouselTouchStart}
                    onCarouselTouchEnd={onCarouselTouchEnd}
                />
            </View>
        );
    }

    const content = <View style={styles.placeholderContainer} />;

    return (
        <PoolFeedDoubleTapLike
            onDoubleTap={() => onDoubleTap(video.id)}
            onSingleTap={onSingleTap}
            onLongPress={onLongPress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
        >
            {content}
        </PoolFeedDoubleTapLike>
    );
}, (prevProps, nextProps) => {
    // ✅ Custom comparison: Only re-render if needed
    const isCarousel = (video: Video) => video.postType === 'carousel' && (video.mediaUrls?.length ?? 0) > 0;

    if (isCarousel(prevProps.video) || isCarousel(nextProps.video)) {
        return (
            prevProps.video.id === nextProps.video.id &&
            prevProps.isActive === nextProps.isActive &&
            prevProps.isCleanScreen === nextProps.isCleanScreen
        );
    }

    // Non-carousel: Only re-render if video ID changes
    return prevProps.video.id === nextProps.video.id;
});

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    placeholderContainer: {
        width: SCREEN_WIDTH,
        height: ITEM_HEIGHT,
        backgroundColor: 'transparent',
    },
});
