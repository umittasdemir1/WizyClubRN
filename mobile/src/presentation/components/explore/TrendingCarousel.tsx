import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    interpolate,
    SharedValue,
    runOnJS
} from 'react-native-reanimated';
import Video from 'react-native-video';
import { VideoCacheService } from '../../../data/services/VideoCacheService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.48; // 2 items visible per screen, slightly wider to reduce gap
const ITEM_HEIGHT = ITEM_WIDTH * (16 / 9); // Exact 9:16 aspect ratio
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

const TrendingCard = ({ item, index, scrollX, onPress, onPreview, onPreviewEnd, activeIndex, onVideoEnd, isMuted }: TrendingCardProps) => {
    const [isPaused, setIsPaused] = useState(false);
    const [lastTap, setLastTap] = useState(0);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const isActive = activeIndex === index;

    // Reset video ready state when becoming inactive
    useEffect(() => {
        if (!isActive) {
            setIsVideoReady(false);
        }
    }, [isActive]);

    const animatedStyle = useAnimatedStyle(() => {
        const inputRange = [
            (index - 1) * (ITEM_WIDTH + ITEM_SPACING),
            index * (ITEM_WIDTH + ITEM_SPACING),
            (index + 1) * (ITEM_WIDTH + ITEM_SPACING),
        ];

        const scale = interpolate(
            scrollX.value,
            inputRange,
            [0.9, 1, 0.9],
            'clamp'
        );

        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.6, 1, 0.6],
            'clamp'
        );

        return {
            transform: [{ scale }],
            opacity,
        };
    });

    const handleVideoPress = () => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (now - lastTap < DOUBLE_TAP_DELAY) {
            // Double tap - go to full screen feed
            onPress(item.id);
        } else {
            // Single tap - pause/play
            setIsPaused(!isPaused);
        }
        setLastTap(now);
    };

    return (
        <Animated.View style={[styles.cardContainer, animatedStyle]}>
            <View style={styles.card}>
                {/* Always show thumbnail first */}
                <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={styles.thumbnail}
                    contentFit="cover"
                />

                {/* Show video on top when active and ready */}
                {isActive && (
                    <Video
                        source={{ uri: item.videoUrl }}
                        style={[
                            styles.thumbnail,
                            { opacity: isVideoReady ? 1 : 0 }
                        ]}
                        resizeMode="cover"
                        repeat={false}
                        paused={!isActive || isPaused}
                        muted={isMuted}
                        onEnd={onVideoEnd}
                        onReadyForDisplay={() => setIsVideoReady(true)}
                    />
                )}

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.4)']}
                    style={styles.gradient}
                    pointerEvents="none"
                />

                {/* Tap Area - Behind overlays so buttons work */}
                <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={handleVideoPress}
                    onLongPress={() => onPreview?.(item)}
                    onPressOut={onPreviewEnd}
                />

                {/* Overlay: User Avatar & Username */}
                <View style={[styles.topOverlay, { zIndex: 10 }]} pointerEvents="box-none">
                    <View style={styles.userInfo} pointerEvents="none">
                        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                        <Text style={styles.username}>@{item.username}</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

export function TrendingCarousel({ data, onItemPress, onPreview, onPreviewEnd, isDark = true }: TrendingCarouselProps) {
    const scrollX = useSharedValue(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);

    // ============================================
    // PREFETCH MECHANISM (TikTok-style)
    // ============================================

    // 1. Initial Prefetch: When carousel loads, prefetch first 3 videos
    const hasInitialPrefetched = useRef(false);
    useEffect(() => {
        if (data.length > 0 && !hasInitialPrefetched.current) {
            hasInitialPrefetched.current = true;
            console.log('[Carousel Prefetch] 🚀 Initial prefetch starting...');

            data.slice(0, 3).forEach((item, i) => {
                // Video prefetch (background download)
                VideoCacheService.cacheVideo(item.videoUrl).then(path => {
                    if (path) console.log(`[Carousel Prefetch] ✅ Video ${i + 1} cached`);
                });
                // Thumbnail prefetch
                if (item.thumbnailUrl) {
                    Image.prefetch(item.thumbnailUrl);
                }
            });
        }
    }, [data.length]);

    // 2. Scroll Prefetch: When active index changes, prefetch next 2 videos
    const lastPrefetchedIndex = useRef(-1);
    useEffect(() => {
        if (data.length === 0) return;
        if (activeIndex === lastPrefetchedIndex.current) return;

        lastPrefetchedIndex.current = activeIndex;

        // Prefetch next 2 videos (if they exist)
        const nextItems = data.slice(activeIndex + 1, activeIndex + 3);
        if (nextItems.length > 0) {
            console.log(`[Carousel Prefetch] 📥 Prefetching ${nextItems.length} upcoming videos...`);

            nextItems.forEach((item, i) => {
                VideoCacheService.cacheVideo(item.videoUrl).then(path => {
                    if (path) console.log(`[Carousel Prefetch] ✅ Next video ${i + 1} cached`);
                });
                if (item.thumbnailUrl) {
                    Image.prefetch(item.thumbnailUrl);
                }
            });
        }
    }, [activeIndex, data]);

    // ============================================

    const updateActiveIndex = (index: number) => {
        setActiveIndex(index);
    };

    const scrollToNext = useCallback(() => {
        const nextIndex = activeIndex + 1;
        if (nextIndex < data.length && scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                    x: nextIndex * (ITEM_WIDTH + ITEM_SPACING),
                    animated: true,
                });
            }, 300);
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
                // @ts-ignore - ref type issue with Animated.ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled={false}
                decelerationRate="fast"
                snapToInterval={ITEM_WIDTH + ITEM_SPACING}
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
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
                    />
                ))}
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
        backgroundColor: '#1a1a1a',
    },
    thumbnail: {
        ...StyleSheet.absoluteFillObject,
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    topOverlay: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 3,
        paddingRight: 8,
        borderRadius: 16,
    },
    avatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'white',
    },
    username: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600',
    },
});