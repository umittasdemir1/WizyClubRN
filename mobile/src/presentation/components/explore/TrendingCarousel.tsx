import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { User, MessageCircle, Heart } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    interpolate,
    SharedValue,
    withSequence,
    withTiming,
    Easing
} from 'react-native-reanimated';
import LikeIcon from '../../../../assets/icons/like.svg';
import { Eye } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.75;
const ITEM_SPACING = 15;

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
}

const TrendingCard = ({ item, index, scrollX, onPress }: TrendingCardProps) => {
    const [isLiked, setIsLiked] = React.useState(item.isLiked || false);
    const likeScale = useSharedValue(1);

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

    return (
        <Animated.View style={[styles.cardContainer, animatedStyle]}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onPress(item.id)}
                style={styles.card}
            >
                <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={styles.thumbnail}
                    contentFit="cover"
                />

                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                />

                {/* Top Overlay: User & Like Icon */}
                <View style={styles.topOverlay}>
                    <View style={styles.userInfo}>
                        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                        <Text style={styles.username}>@{item.username}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.actionIcon}
                        onPress={handleLike}
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

                {/* Bottom Overlay: Title & Stats */}
                <View style={styles.bottomOverlay}>
                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Eye size={16} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.statText}>{item.views}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export function TrendingCarousel({ data, onItemPress, isDark = true }: TrendingCarouselProps) {
    const scrollX = useSharedValue(0);

    const onScroll = useAnimatedScrollHandler((event) => {
        scrollX.value = event.contentOffset.x;
    });

    return (
        <View style={styles.container}>
            <Animated.ScrollView
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
                    />
                ))}
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 480,
    },
    scrollContent: {
        paddingHorizontal: (SCREEN_WIDTH - ITEM_WIDTH) / 2,
        alignItems: 'center',
    },
    cardContainer: {
        width: ITEM_WIDTH,
        height: 450,
        marginHorizontal: ITEM_SPACING / 2,
    },
    card: {
        flex: 1,
        borderRadius: 30,
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
        top: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 4,
        paddingRight: 10,
        borderRadius: 20,
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'white',
    },
    username: {
        color: 'white',
        fontSize: 11,
        fontWeight: '600',
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottomOverlay: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
    },
    title: {
        color: 'white',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 15,
        lineHeight: 28,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 15,
    },
    statText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
});
