import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { User, MessageCircle, Heart, Volume2, VolumeX } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    interpolate,
    SharedValue,
    withSequence,
    withTiming,
    Easing,
    runOnJS
} from 'react-native-reanimated';
import LikeIcon from '../../../../assets/icons/like.svg';
import { Play } from 'lucide-react-native';
import Video from 'react-native-video';
import { VideoCacheService } from '../../../data/services/VideoCacheService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.48; // 2 items visible per screen, slightly wider to reduce gap
const ITEM_SPACING = 0;

const LIKE_COLOR = '#FF2146';
const HEARTBEAT_DURATION = 100;

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
    isDark?: boolean;
}

interface TrendingCardProps {
    item: TrendingItem;
    index: number;
    scrollX: SharedValue<number>;
    onPress: (id: string) => void;
    activeIndex: number;
    onVideoEnd?: () => void;
    isMuted: boolean;
    onMuteToggle: () => void;
}

const TrendingCard = ({ item, index, scrollX, onPress, activeIndex, onVideoEnd, isMuted, onMuteToggle }: TrendingCardProps) => {
    const [isLiked, setIsLiked] = React.useState(item.isLiked || false);
    const [isPaused, setIsPaused] = useState(false);
    const [lastTap, setLastTap] = useState(0);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const likeScale = useSharedValue(1);
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

    const likeAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: likeScale.value }],
    }));

    const handleLike = (e: any) => {
        e.stopPropagation();
        likeScale.value = withSequence(
            withTiming(1.4, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) }),
            withTiming(0.8, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.2, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) })
        );
        setIsLiked(!isLiked);
    };

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

    const handleMuteToggle = (e: any) => {
        e.stopPropagation();
        onMuteToggle();
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
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                    pointerEvents="none"
                />

                {/* Tap Area - Behind overlays so buttons work */}
                <Pressable
                    style={StyleSheet.absoluteFillObject}
                    onPress={handleVideoPress}
                />

                {/* Top Overlay: User & Mute Icon */}
                <View style={[styles.topOverlay, { zIndex: 10 }]} pointerEvents="box-none">
                    <View style={styles.userInfo} pointerEvents="none">
                        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                        <Text style={styles.username}>@{item.username}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.actionIcon}
                        onPress={handleMuteToggle}
                        activeOpacity={0.7}
                    >
                        {isMuted ? (
                            <VolumeX size={18} color="white" />
                        ) : (
                            <Volume2 size={18} color="white" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Bottom Overlay: Title, Stats & Like */}
                <View style={[styles.bottomOverlay, { zIndex: 10 }]} pointerEvents="box-none">
                    <View style={styles.bottomRow} pointerEvents="box-none">
                        <View style={styles.bottomLeft} pointerEvents="none">
                            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                            <View style={styles.statsRow}>
                                <View style={styles.stat}>
                                    <Play size={12} color="rgba(255,255,255,0.8)" fill="rgba(255,255,255,0.8)" />
                                    <Text style={styles.statText}>{item.views}</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.likeButton}
                            onPress={handleLike}
                            activeOpacity={0.7}
                        >
                            <Animated.View style={likeAnimatedStyle}>
                                <LikeIcon
                                    width={24}
                                    height={24}
                                    color={isLiked ? LIKE_COLOR : "white"}
                                />
                            </Animated.View>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

export function TrendingCarousel({ data, onItemPress, isDark = true }: TrendingCarouselProps) {
    const scrollX = useSharedValue(0);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
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
    }, [data.length > 0]);

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

    const handleMuteToggle = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

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
                        activeIndex={activeIndex}
                        onVideoEnd={scrollToNext}
                        isMuted={isMuted}
                        onMuteToggle={handleMuteToggle}
                    />
                ))}
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
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    cardContainer: {
        width: ITEM_WIDTH,
        height: 280,
        marginRight: 0,
    },
    card: {
        flex: 1,
        borderRadius: 16,
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
    actionIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomOverlay: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    bottomLeft: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        color: 'white',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
        lineHeight: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    likeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600',
    },
});
