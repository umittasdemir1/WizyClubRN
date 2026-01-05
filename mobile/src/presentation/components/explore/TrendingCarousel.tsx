import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    interpolate,
    SharedValue,
    runOnJS,
    withTiming
} from 'react-native-reanimated';
import Video from 'react-native-video';
import { VideoCacheService } from '../../../data/services/VideoCacheService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.44; 
const ITEM_HEIGHT = ITEM_WIDTH * (16 / 9); 
const ITEM_SPACING = 0;

interface TrendingItem {
    id: string;
    title: string;
    username: string;
    avatarUrl: string;
    thumbnailUrl: string;
    views: string;
    isLiked?: boolean;
    videoUrl: string;
}

interface TrendingCarouselProps {
    data: TrendingItem[];
    onItemPress: (id: string) => void;
    onPreview?: (item: any) => void;
    onPreviewEnd?: () => void;
    isDark?: boolean;
    scrollEnabled?: boolean;
}

interface TrendingCardProps {
    item: TrendingItem;
    index: number;
    scrollX: SharedValue<number>;
    onPress: (id: string) => void;
    onPreview?: (item: any) => void;
    onPreviewEnd?: () => void;
    activeIndex: number;
    onVideoEnd?: () => void;
    isMuted: boolean;
}

const TrendingCard = memo(({ item, index, scrollX, onPress, onPreview, onPreviewEnd, activeIndex, onVideoEnd, isMuted }: TrendingCardProps) => {
    const [isPaused, setIsPaused] = useState(false);
    const [lastTap, setLastTap] = useState(0);
    const isActive = activeIndex === index;
    const shouldLoad = index >= activeIndex && index <= activeIndex + 2;
    
    const thumbnailOpacity = useSharedValue(1);
    const hasTriggeredEnd = useRef(false);

    useEffect(() => {
        if (isActive) {
            hasTriggeredEnd.current = false;
        } else {
            thumbnailOpacity.value = 1;
        }
    }, [isActive]);

    const triggerEnd = useCallback(() => {
        if (isActive && !hasTriggeredEnd.current) {
            hasTriggeredEnd.current = true;
            onVideoEnd?.();
        }
    }, [isActive, onVideoEnd]);

    const animatedCardStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * (ITEM_WIDTH + ITEM_SPACING),
            index * (ITEM_WIDTH + ITEM_SPACING),
            (index + 1) * (ITEM_WIDTH + ITEM_SPACING),
        ];
        const scale = interpolate(scrollX.value, inputRange, [0.9, 1, 0.9], 'clamp');
        return { transform: [{ scale }] };
    });

    const animatedThumbnailStyle = useAnimatedStyle(() => ({
        opacity: thumbnailOpacity.value
    }));

    const handleVideoPress = () => {
        const now = Date.now();
        if (now - lastTap < 300) {
            onPress(item.id);
        } else {
            setIsPaused(!isPaused);
        }
        setLastTap(now);
    };

    return (
        <Animated.View style={[styles.cardContainer, animatedCardStyle]}>
            <View style={styles.card}>
                {/* 1. Video is ALWAYS at 100% opacity in the background */}
                {shouldLoad && (
                    <View style={StyleSheet.absoluteFill}>
                        <Video
                            source={{ uri: item.videoUrl }}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                            repeat={true}
                            paused={!isActive || isPaused}
                            muted={isMuted}
                            onEnd={triggerEnd}
                            onReadyForDisplay={() => {
                                if (isActive) {
                                    // Smoothly fade out the cover (thumbnail) to reveal the video
                                    thumbnailOpacity.value = withTiming(0, { duration: 200 });
                                }
                            }}
                            onProgress={({ currentTime }) => {
                                if (isActive && currentTime >= 5) triggerEnd();
                            }}
                            bufferConfig={{
                                minBufferMs: 1000,
                                maxBufferMs: 3000,
                                bufferForPlaybackMs: 100,
                                bufferForPlaybackAfterRebufferMs: 500
                            }}
                            shutterColor="transparent"
                            automaticallyWaitsToMinimizeStalling={false}
                        />
                    </View>
                )}

                {/* 2. Thumbnail is ON TOP and fades out */}
                <Animated.View style={[StyleSheet.absoluteFill, animatedThumbnailStyle]} pointerEvents="none">
                    <Image
                        source={{ uri: item.thumbnailUrl }}
                        style={styles.thumbnail}
                        contentFit="cover"
                    />
                </Animated.View>

                <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={handleVideoPress}
                    onLongPress={() => onPreview?.(item)}
                    delayLongPress={300}
                />
            </View>
        </Animated.View>
    );
});

export function TrendingCarousel({ data, onItemPress, onPreview, onPreviewEnd, isDark = true, scrollEnabled = true }: TrendingCarouselProps) {
    const scrollX = useSharedValue(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const lastScrollTriggered = useRef(-1);

    useEffect(() => {
        if (data.length > 0) {
            data.slice(0, 3).forEach((item) => {
                if (item.thumbnailUrl) Image.prefetch(item.thumbnailUrl);
            });
        }
    }, [data.length]);

    useEffect(() => {
        if (data.length === 0) return;
        const nextItems = data.slice(activeIndex + 1, activeIndex + 3);
        nextItems.forEach((item) => {
            if (item.thumbnailUrl) Image.prefetch(item.thumbnailUrl);
        });
    }, [activeIndex, data]);

    const updateActiveIndex = (index: number) => {
        setActiveIndex(index);
    };

    const scrollToNext = useCallback(() => {
        let nextIndex = activeIndex + 1;
        if (nextIndex >= data.length) nextIndex = 0;

        if (nextIndex !== lastScrollTriggered.current && scrollViewRef.current) {
            lastScrollTriggered.current = nextIndex;
            scrollViewRef.current?.scrollTo({
                x: nextIndex * (ITEM_WIDTH + ITEM_SPACING),
                animated: true,
            });
            setTimeout(() => { lastScrollTriggered.current = -1; }, 500);
        }
    }, [activeIndex, data.length]);

    const onScroll = useAnimatedScrollHandler((event) => {
        scrollX.value = event.contentOffset.x;
        const index = Math.round(event.contentOffset.x / (ITEM_WIDTH + ITEM_SPACING));
        runOnJS(updateActiveIndex)(index);
    });

    return (
        <View style={styles.container}>
            <Animated.ScrollView
                ref={scrollViewRef as any}
                horizontal
                pagingEnabled={false}
                decelerationRate="fast"
                snapToInterval={ITEM_WIDTH + ITEM_SPACING}
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                scrollEnabled={scrollEnabled}
                contentContainerStyle={styles.scrollContent}
            >
                {data.map((item, index) => (
                    <TrendingCard
                        key={item.id}
                        item={item}
                        index={index}
                        scrollX={scrollX}
                        onPress={onItemPress}
                        onPreview={showPreview => onPreview?.(showPreview)}
                        onPreviewEnd={onPreviewEnd}
                        activeIndex={activeIndex}
                        onVideoEnd={scrollToNext}
                        isMuted={true}
                    />
                ))}
                <View style={{ width: SCREEN_WIDTH - ITEM_WIDTH - 24 }} />
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 380,
        marginTop: -10,
    },
    scrollContent: {
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    cardContainer: {
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT,
        marginRight: 0,
    },
    card: {
        flex: 1,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    thumbnail: {
        ...StyleSheet.absoluteFillObject,
    },
});