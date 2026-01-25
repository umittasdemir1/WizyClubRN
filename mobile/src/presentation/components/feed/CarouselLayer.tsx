import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, FlatList, ViewToken, Pressable, GestureResponderEvent, Text } from 'react-native';
import Video, { SelectedTrackType } from 'react-native-video';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import LikeIcon from '../../../../assets/icons/doubletablike.svg';
import { shadowStyle } from '@/core/utils/shadow';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CarouselItem {
    url: string;
    type: 'video' | 'image';
    thumbnail?: string;
}

interface CarouselLayerProps {
    mediaUrls: CarouselItem[];
    isActive: boolean;
    isMuted: boolean;
    isCleanScreen?: boolean;
    onDoubleTap?: () => void;
    onSingleTap?: () => void;
    onLongPress?: (event: GestureResponderEvent) => void;
    onPressOut?: () => void;
    onPressIn?: (event: GestureResponderEvent) => void;
    onCarouselTouchStart?: () => void;
    onCarouselTouchEnd?: () => void;
}

const DOUBLE_TAP_DELAY = 250;
const HEART_COLOR = '#FF2146';
const HEART_SIZE = 100;
const TAP_Y_OFFSET = HEART_SIZE * 0.6;

const AnimatedLikeIcon = Animated.createAnimatedComponent(LikeIcon);

export function CarouselLayer({
    mediaUrls,
    isActive,
    isMuted,
    isCleanScreen = false,
    onDoubleTap,
    onSingleTap,
    onLongPress,
    onPressOut,
    onPressIn,
    onCarouselTouchStart,
    onCarouselTouchEnd,
}: CarouselLayerProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const tapCount = useRef(0);
    const tapTimer = useRef<NodeJS.Timeout | null>(null);
    const insets = useSafeAreaInsets();
    const containerSizeRef = useRef({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const rotation = useSharedValue(0);
    const heartX = useSharedValue(SCREEN_WIDTH / 2);
    const heartY = useSharedValue(SCREEN_HEIGHT / 2);

    const lastActiveIndexRef = useRef(0);
    const handleScroll = useCallback((event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const nextIndex = Math.round(offsetX / SCREEN_WIDTH);
        if (nextIndex !== lastActiveIndexRef.current) {
            lastActiveIndexRef.current = nextIndex;
            setActiveIndex(nextIndex);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (tapTimer.current) {
                clearTimeout(tapTimer.current);
            }
        };
    }, []);

    const performAnimation = useCallback((x?: number, y?: number) => {
        const randomAngle = Math.random() * 30 - 15;
        rotation.value = randomAngle;
        if (typeof x === 'number' && typeof y === 'number') {
            heartX.value = x;
            heartY.value = y;
        }
        opacity.value = 1;
        scale.value = 0;

        scale.value = withSpring(1.2, { mass: 0.8, damping: 12, stiffness: 300 }, (finished) => {
            if (finished) {
                scale.value = withTiming(0, { duration: 150 });
                opacity.value = withTiming(0, { duration: 150 });
            }
        });
    }, [scale, opacity, rotation, heartX, heartY]);

    const handlePress = useCallback((event: GestureResponderEvent) => {
        tapCount.current += 1;
        if (tapCount.current === 1) {
            tapTimer.current = setTimeout(() => {
                if (tapCount.current === 1 && onSingleTap) {
                    onSingleTap();
                }
                tapCount.current = 0;
            }, DOUBLE_TAP_DELAY);
        } else if (tapCount.current === 2) {
            if (tapTimer.current) {
                clearTimeout(tapTimer.current);
                tapTimer.current = null;
            }
            tapCount.current = 0;
            const rawX = event.nativeEvent.locationX;
            const rawY = event.nativeEvent.locationY - TAP_Y_OFFSET;
            const { width, height } = containerSizeRef.current;
            const tapX = Math.max(HEART_SIZE / 2, Math.min(width - HEART_SIZE / 2, rawX));
            const tapY = Math.max(HEART_SIZE / 2, Math.min(height - HEART_SIZE / 2, rawY));
            performAnimation(tapX, tapY);
            onDoubleTap?.();
        }
    }, [onSingleTap, onDoubleTap, performAnimation]);

    const handleLongPress = useCallback((event: GestureResponderEvent) => {
        if (!onLongPress) return;
        if (tapTimer.current) {
            clearTimeout(tapTimer.current);
            tapTimer.current = null;
        }
        tapCount.current = 0;
        onLongPress(event);
    }, [onLongPress]);

    const heartAnimatedStyle = useAnimatedStyle(() => ({
        position: 'absolute',
        transform: [
            { translateX: heartX.value - HEART_SIZE / 2 },
            { translateY: heartY.value - HEART_SIZE / 2 },
            { scale: Math.max(scale.value, 0) },
            { rotate: `${rotation.value}deg` },
        ],
        opacity: opacity.value,
    }));

    const imageItems = useMemo(() => mediaUrls.filter((item) => item.type === 'image'), [mediaUrls]);
    const activeItem = mediaUrls[activeIndex];
    const isActiveImage = activeItem?.type === 'image';
    const activeImageIndex = isActiveImage ? imageItems.indexOf(activeItem) : -1;

    return (
        <View
            style={styles.container}
            onLayout={(event) => {
                containerSizeRef.current = {
                    width: event.nativeEvent.layout.width,
                    height: event.nativeEvent.layout.height,
                };
            }}
        >
            <FlatList
                ref={flatListRef}
                data={mediaUrls}
                renderItem={({ item, index }) => (
                    <CarouselMediaItem
                        item={item}
                        isActive={isActive && activeIndex === index}
                        isMuted={isMuted}
                        onPress={handlePress}
                        onLongPress={onLongPress ? handleLongPress : undefined}
                        onPressOut={onPressOut}
                        onPressIn={onPressIn}
                    />
                )}
                keyExtractor={(item, index) => `${item.url}-${index}`}
                horizontal
                pagingEnabled={false}
                showsHorizontalScrollIndicator={false}
                directionalLockEnabled
                nestedScrollEnabled
                onTouchStart={onCarouselTouchStart}
                onTouchEnd={onCarouselTouchEnd}
                onTouchCancel={onCarouselTouchEnd}
                onScroll={handleScroll}
                decelerationRate="fast"
                snapToInterval={SCREEN_WIDTH}
                snapToAlignment="start"
                disableIntervalMomentum
                getItemLayout={(data, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                })}
                initialScrollIndex={0}
                bounces={false}
                scrollEventThrottle={16}
                onScrollBeginDrag={onCarouselTouchStart}
                onScrollEndDrag={onCarouselTouchEnd}
                onMomentumScrollEnd={onCarouselTouchEnd}
            />

            {/* Dots Indicator */}
            {!isCleanScreen && mediaUrls.length > 1 && (
                <View style={styles.indicatorContainer}>
                    <View style={styles.indicatorPill}>
                        {mediaUrls.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: index === activeIndex ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                                        width: index === activeIndex ? 12 : 6,
                                    }
                                ]}
                            />
                        ))}
                    </View>
                </View>
            )}

            {/* Photo index indicator (images only) */}
            {!isCleanScreen && isActiveImage && imageItems.length > 0 && activeImageIndex >= 0 && (
                <View
                    style={[
                        styles.photoIndexBadge,
                        { top: insets.top + 72 },
                    ]}
                    pointerEvents="none"
                >
                    <Text style={styles.photoIndexText}>
                        {activeImageIndex + 1}/{imageItems.length}
                    </Text>
                </View>
            )}

            {/* Double-tap heart */}
            <View style={styles.iconContainer} pointerEvents="none">
                <Animated.View style={[styles.heartWrapper, heartAnimatedStyle]}>
                    <AnimatedLikeIcon width={HEART_SIZE} height={HEART_SIZE} color={HEART_COLOR} />
                </Animated.View>
            </View>
        </View>
    );
}

interface CarouselItemProps {
    item: CarouselItem;
    isActive: boolean;
    isMuted: boolean;
    onPress: (event: GestureResponderEvent) => void;
    onLongPress?: (event: GestureResponderEvent) => void;
    onPressOut?: () => void;
    onPressIn?: (event: GestureResponderEvent) => void;
}

function CarouselMediaItem({
    item,
    isActive,
    isMuted,
    onPress,
    onLongPress,
    onPressOut,
    onPressIn,
}: CarouselItemProps) {
    if (item.type === 'video') {
        return (
            <Pressable
                style={styles.mediaContainer}
                onPress={onPress}
                onLongPress={onLongPress}
                onPressOut={onPressOut}
                onPressIn={onPressIn}
                delayLongPress={300}
            >
                <Video
                    source={{ uri: item.url }}
                    style={styles.video}
                    resizeMode="cover"
                    repeat={true}
                    paused={!isActive}
                    muted={isMuted}
                    selectedAudioTrack={isMuted ? { type: SelectedTrackType.DISABLED } : undefined}
                    playInBackground={false}
                    playWhenInactive={false}
                    ignoreSilentSwitch="ignore"
                    mixWithOthers={isMuted ? "mix" : undefined}
                    disableFocus={isMuted}
                />
            </Pressable>
        );
    }

    // Image - Match video behavior (full-screen cover)
    return (
        <Pressable
            style={styles.mediaContainer}
            onPress={onPress}
            onLongPress={onLongPress}
            onPressOut={onPressOut}
            onPressIn={onPressIn}
            delayLongPress={300}
        >
            <Image
                source={{ uri: item.url }}
                style={styles.image}
                contentFit="contain"
                cachePolicy="memory-disk"
                priority="high"
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    mediaContainer: {
        width: SCREEN_WIDTH,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    indicatorContainer: {
        position: 'absolute',
        bottom: 110,
        flexDirection: 'row',
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    indicatorPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    iconContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        zIndex: 999,
    },
    heartWrapper: {
        ...shadowStyle({ color: '#000000', offset: { width: 0, height: 8 }, opacity: 0.5, radius: 15, elevation: 20 }),
    },
    dot: {
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    photoIndexBadge: {
        position: 'absolute',
        right: 16,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    photoIndexText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
});
