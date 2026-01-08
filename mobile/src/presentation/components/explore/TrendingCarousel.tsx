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
import MoreIcon from '../../../../assets/icons/more.svg';
import { VideoCacheService } from '../../../../src/data/services/VideoCacheService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.38;
const ITEM_HEIGHT = ITEM_WIDTH * (16 / 9);
const ITEM_SPACING = 16;

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
    isPreviewActive?: boolean;
    isScreenFocused?: boolean;
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
    isPreviewActive?: boolean;
    isScreenFocused?: boolean;
    dataLength: number;
}

const TrendingCard = memo(({ item, index, scrollX, onPress, onPreview, onPreviewEnd, activeIndex, onVideoEnd, isMuted, isPreviewActive, isScreenFocused = true, dataLength }: TrendingCardProps) => {
    const [isPaused, setIsPaused] = useState(false);
    const [lastTap, setLastTap] = useState(0);
    const [videoSource, setVideoSource] = useState({ uri: item.videoUrl });
    const isActive = activeIndex === index;

    // Circular preloading logic
    // Load normal window AND wrap-around items
    const shouldLoad =
        (index >= activeIndex - 1 && index <= activeIndex + 2) ||
        (activeIndex >= dataLength - 2 && index <= 1) || // End of list -> load start
        (activeIndex <= 1 && index >= dataLength - 1);   // Start of list -> load end

    const thumbnailOpacity = useSharedValue(1);
    const hasTriggeredEnd = useRef(false);
    const activeStartTime = useRef(Date.now());
    const videoRef = useRef<any>(null);

    useEffect(() => {
        let isMounted = true;
        const loadVideo = async () => {
            if (shouldLoad) {
                const cachedPath = await VideoCacheService.getCachedVideoPath(item.videoUrl);
                if (isMounted) {
                    if (cachedPath) {
                        setVideoSource({ uri: cachedPath });
                    } else {
                        // If not cached, start caching but keep playing from URL
                        VideoCacheService.cacheVideo(item.videoUrl).then(path => {
                            if (isMounted && path) {
                                setVideoSource({ uri: path });
                            }
                        });
                    }
                }
            }
        };
        loadVideo();
        return () => { isMounted = false; };
    }, [item.videoUrl, shouldLoad]);

    useEffect(() => {
        if (isActive) {
            hasTriggeredEnd.current = false;
            activeStartTime.current = Date.now();
            // Reset video to start when it becomes active
            videoRef.current?.seek(0);
        } else {
            thumbnailOpacity.value = 1;
        }
    }, [isActive]);

    const triggerEnd = useCallback(() => {
        // If screen is not focused, do not trigger end
        if (!isScreenFocused) return;

        const timeSinceActive = Date.now() - activeStartTime.current;
        if (isActive && !hasTriggeredEnd.current && timeSinceActive > 1000) {
            hasTriggeredEnd.current = true;
            onVideoEnd?.();
        }
    }, [isActive, onVideoEnd, isScreenFocused]);

    const animatedCardStyle = useAnimatedStyle(() => {
        // Uniform size: scale 1 for all items
        return { transform: [{ scale: 1 }] };
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
                {/* 1. Video Layer */}
                {shouldLoad && (
                    <View style={StyleSheet.absoluteFill}>
                        <Video
                            ref={videoRef}
                            source={videoSource}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                            repeat={true}
                            paused={!isActive || isPaused || isPreviewActive || !isScreenFocused}
                            muted={isMuted}
                            onEnd={triggerEnd}
                            onReadyForDisplay={() => {
                                if (isActive) {
                                    thumbnailOpacity.value = withTiming(0, { duration: 250 });
                                }
                            }}
                            onProgress={({ currentTime }) => {
                                if (isActive && isScreenFocused && currentTime >= 5) triggerEnd();
                            }}
                            bufferConfig={{
                                minBufferMs: 500,
                                maxBufferMs: 1500,
                                bufferForPlaybackMs: 10,
                                bufferForPlaybackAfterRebufferMs: 100
                            }}
                            shutterColor="transparent"
                            automaticallyWaitsToMinimizeStalling={false}
                        />
                    </View>
                )}

                {/* 2. Thumbnail Overlay */}
                <Animated.View style={[StyleSheet.absoluteFill, animatedThumbnailStyle]} pointerEvents="none">
                    <Image
                        source={{ uri: item.thumbnailUrl }}
                        style={styles.thumbnail}
                        contentFit="cover"
                    />
                </Animated.View>

                {/* More Icon - Top Right */}
                <View style={styles.moreIconContainer}>
                    <MoreIcon width={24} height={24} color="#fff" />
                </View>

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

export function TrendingCarousel({ data, onItemPress, onPreview, onPreviewEnd, isDark = true, scrollEnabled = true, isPreviewActive = false, isScreenFocused = true }: TrendingCarouselProps) {
    const scrollX = useSharedValue(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const lastScrollTriggered = useRef(-1);

    const updateActiveIndex = (index: number) => {
        if (index !== activeIndex) {
            setActiveIndex(index);
        }
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
                        onPreview={onPreview}
                        onPreviewEnd={onPreviewEnd}
                        activeIndex={activeIndex}
                        onVideoEnd={scrollToNext}
                        isMuted={true}
                        isPreviewActive={isPreviewActive}
                        isScreenFocused={isScreenFocused}
                        dataLength={data.length}
                    />
                ))}
                <View style={{ width: SCREEN_WIDTH - ITEM_WIDTH - 24 }} />
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 320,
        marginTop: -10,
    },
    scrollContent: {
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    cardContainer: {
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT,
        marginRight: ITEM_SPACING,
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
    moreIconContainer: {
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
    },
});