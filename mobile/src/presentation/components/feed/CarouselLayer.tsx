import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, FlatList, Pressable, GestureResponderEvent, Text, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadowStyle } from '@/core/utils/shadow';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.heic', '.heif', '.avif'];
const AUTO_ADVANCE_INTERVAL_MS = 5000;
const AUTO_ADVANCE_RESUME_DELAY_MS = 1000;

const isImageUrl = (url: string): boolean => {
    const normalized = url.split('?')[0].toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => normalized.endsWith(ext));
};

interface CarouselItem {
    url: string;
    thumbnail?: string;
}

interface CarouselLayerProps {
    mediaUrls: CarouselItem[];
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

export function CarouselLayer({
    mediaUrls,
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
    const loadedIndicesRef = useRef<Set<number>>(new Set());
    const [activeImageLoaded, setActiveImageLoaded] = useState(false);
    const autoAdvanceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isInteractingRef = useRef(false);
    const lastInteractionRef = useRef(0);
    const autoAdvanceStartIndexRef = useRef<number | null>(null);
    const autoAdvanceHasAdvancedRef = useRef(false);
    const autoAdvanceHasLoopedRef = useRef(false);

    const lastActiveIndexRef = useRef(0);
    const normalizedItems = useMemo(
        () => mediaUrls.filter((item) => isImageUrl(item.url)),
        [mediaUrls]
    );

    const handleScroll = useCallback((event: any) => {
        if (normalizedItems.length === 0) return;
        const offsetX = event.nativeEvent.contentOffset.x;
        const nextIndex = Math.round(offsetX / SCREEN_WIDTH);
        const clampedIndex = Math.max(0, Math.min(nextIndex, normalizedItems.length - 1));
        if (clampedIndex !== lastActiveIndexRef.current) {
            lastActiveIndexRef.current = clampedIndex;
            setActiveIndex(clampedIndex);
        }
    }, [normalizedItems.length]);

    useEffect(() => {
        return () => {
            if (tapTimer.current) {
                clearTimeout(tapTimer.current);
            }
        };
    }, []);

    const handlePress = useCallback((_event: GestureResponderEvent) => {
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
            onDoubleTap?.();
        }
    }, [onSingleTap, onDoubleTap]);

    const handleLongPress = useCallback((event: GestureResponderEvent) => {
        if (!onLongPress) return;
        if (tapTimer.current) {
            clearTimeout(tapTimer.current);
            tapTimer.current = null;
        }
        tapCount.current = 0;
        onLongPress(event);
    }, [onLongPress]);

    useEffect(() => {
        if (normalizedItems.length === 0) {
            lastActiveIndexRef.current = 0;
            if (activeIndex !== 0) setActiveIndex(0);
            setActiveImageLoaded(false);
            autoAdvanceStartIndexRef.current = null;
            autoAdvanceHasAdvancedRef.current = false;
            autoAdvanceHasLoopedRef.current = false;
            return;
        }
        if (activeIndex >= normalizedItems.length) {
            lastActiveIndexRef.current = 0;
            setActiveIndex(0);
            setActiveImageLoaded(false);
        }
        setActiveImageLoaded(loadedIndicesRef.current.has(activeIndex));
    }, [activeIndex, normalizedItems.length]);

    useEffect(() => {
        if (normalizedItems.length === 0) return;
        const targets = new Set<number>();
        [activeIndex - 1, activeIndex, activeIndex + 1, activeIndex + 2].forEach((idx) => {
            if (idx >= 0 && idx < normalizedItems.length) targets.add(idx);
        });
        targets.forEach((idx) => {
            const url = normalizedItems[idx]?.url;
            if (url) {
                Image.prefetch(url);
            }
        });
    }, [activeIndex, normalizedItems]);

    useEffect(() => {
        if (normalizedItems.length < 2) return;

        if (autoAdvanceTimerRef.current) {
            clearInterval(autoAdvanceTimerRef.current);
            autoAdvanceTimerRef.current = null;
        }

        autoAdvanceTimerRef.current = setInterval(() => {
            if (!flatListRef.current) return;
            if (!activeImageLoaded) return;
            if (isInteractingRef.current) return;
            if (Date.now() - lastInteractionRef.current < AUTO_ADVANCE_RESUME_DELAY_MS) return;

            if (autoAdvanceHasLoopedRef.current) return;

            if (autoAdvanceStartIndexRef.current == null) {
                autoAdvanceStartIndexRef.current = lastActiveIndexRef.current;
                autoAdvanceHasAdvancedRef.current = false;
                autoAdvanceHasLoopedRef.current = false;
            }

            const nextIndex = lastActiveIndexRef.current + 1;
            if (nextIndex >= normalizedItems.length) {
                autoAdvanceHasLoopedRef.current = true;
                if (autoAdvanceTimerRef.current) {
                    clearInterval(autoAdvanceTimerRef.current);
                    autoAdvanceTimerRef.current = null;
                }
                return;
            }

            flatListRef.current.scrollToOffset({
                offset: nextIndex * SCREEN_WIDTH,
                animated: true,
            });
            autoAdvanceHasAdvancedRef.current = true;
        }, AUTO_ADVANCE_INTERVAL_MS);

        return () => {
            if (autoAdvanceTimerRef.current) {
                clearInterval(autoAdvanceTimerRef.current);
                autoAdvanceTimerRef.current = null;
            }
        };
    }, [normalizedItems.length, activeImageLoaded]);

    const handleImageDone = useCallback((index: number) => {
        loadedIndicesRef.current.add(index);
        if (index === activeIndex) {
            setActiveImageLoaded(true);
        }
    }, [activeIndex]);

    const handleInteractionStart = useCallback(() => {
        isInteractingRef.current = true;
        lastInteractionRef.current = Date.now();
    }, []);

    const handleInteractionEnd = useCallback(() => {
        isInteractingRef.current = false;
        lastInteractionRef.current = Date.now();
        autoAdvanceStartIndexRef.current = lastActiveIndexRef.current;
        autoAdvanceHasAdvancedRef.current = false;
        autoAdvanceHasLoopedRef.current = false;
    }, []);

    const imageItems = normalizedItems;
    const activeItem = normalizedItems[activeIndex];
    const isActiveImage = Boolean(activeItem);
    const activeImageIndex = isActiveImage ? activeIndex : -1;

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={normalizedItems}
                renderItem={({ item, index }) => (
                    <CarouselMediaItem
                        item={item}
                        index={index}
                        onPress={handlePress}
                        onLongPress={onLongPress ? handleLongPress : undefined}
                        onPressOut={onPressOut}
                        onPressIn={onPressIn}
                        onImageDone={handleImageDone}
                    />
                )}
                keyExtractor={(item, index) => `${item.url}-${index}`}
                horizontal
                pagingEnabled={false}
                showsHorizontalScrollIndicator={false}
                directionalLockEnabled
                nestedScrollEnabled
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
                onScrollBeginDrag={(event) => {
                    handleInteractionStart();
                    onCarouselTouchStart?.();
                }}
                onScrollEndDrag={(event) => {
                    handleInteractionEnd();
                    onCarouselTouchEnd?.();
                }}
                onMomentumScrollEnd={(event) => {
                    handleInteractionEnd();
                    onCarouselTouchEnd?.();
                }}
                onTouchStart={(event) => {
                    handleInteractionStart();
                    onCarouselTouchStart?.();
                }}
                onTouchEnd={(event) => {
                    handleInteractionEnd();
                    onCarouselTouchEnd?.();
                }}
                onTouchCancel={(event) => {
                    handleInteractionEnd();
                    onCarouselTouchEnd?.();
                }}
            />

            {/* Dots Indicator */}
            {!isCleanScreen && normalizedItems.length > 1 && (
                <View style={styles.indicatorContainer}>
                    <View style={styles.indicatorPill}>
                        {normalizedItems.map((_, index) => (
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
                        { top: insets.top + 92 },
                    ]}
                    pointerEvents="none"
                >
                    <Text style={styles.photoIndexText}>
                        {activeImageIndex + 1}/{imageItems.length}
                    </Text>
                </View>
            )}

            {normalizedItems.length > 0 && !activeImageLoaded && (
                <View style={styles.loadingOverlay} pointerEvents="none">
                    <ActivityIndicator color="#FFFFFF" />
                </View>
            )}

        </View>
    );
}

interface CarouselItemProps {
    item: CarouselItem;
    index: number;
    onPress: (event: GestureResponderEvent) => void;
    onLongPress?: (event: GestureResponderEvent) => void;
    onPressOut?: () => void;
    onPressIn?: (event: GestureResponderEvent) => void;
    onImageDone: (index: number) => void;
}

function CarouselMediaItem({
    item,
    index,
    onPress,
    onLongPress,
    onPressOut,
    onPressIn,
    onImageDone,
}: CarouselItemProps) {
    // Image-only carousel
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
                placeholder={item.thumbnail ? { uri: item.thumbnail } : undefined}
                onLoad={() => onImageDone(index)}
                onError={() => onImageDone(index)}
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
    image: {
        width: '100%',
        height: '100%',
    },
    indicatorContainer: {
        position: 'absolute',
        bottom: 140,
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
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        zIndex: 200,
    },
});
