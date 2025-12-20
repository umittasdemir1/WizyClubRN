import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH * 0.80;
const BANNER_SPACING = 20;

interface AdBanner {
    id: string;
    imageUrl: string;
    onPress?: () => void;
}

interface HeroBannerCarouselProps {
    banners: AdBanner[];
}

export function HeroBannerCarousel({ banners }: HeroBannerCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollX = useSharedValue(0);

    const updateActiveIndex = (index: number) => {
        setActiveIndex(index);
    };

    const onScroll = useAnimatedScrollHandler((event) => {
        scrollX.value = event.contentOffset.x;
        const index = Math.round(event.contentOffset.x / (BANNER_WIDTH + BANNER_SPACING));
        runOnJS(updateActiveIndex)(index);
    });

    return (
        <View style={styles.container}>
            <Animated.ScrollView
                horizontal
                pagingEnabled={false}
                decelerationRate="fast"
                snapToInterval={BANNER_WIDTH + BANNER_SPACING}
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.scrollContent}
            >
                {banners.map((banner, index) => (
                    <TouchableOpacity
                        key={banner.id}
                        activeOpacity={0.9}
                        onPress={banner.onPress}
                        style={styles.bannerContainer}
                    >
                        <Image
                            source={{ uri: banner.imageUrl }}
                            style={styles.banner}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    </TouchableOpacity>
                ))}
            </Animated.ScrollView>

            {/* Dots Indicator */}
            {banners.length > 1 && (
                <View style={styles.dotsContainer}>
                    {banners.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                index === activeIndex ? styles.dotActive : styles.dotInactive,
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 224,
        marginBottom: 24,
    },
    scrollContent: {
        paddingHorizontal: (SCREEN_WIDTH - BANNER_WIDTH - BANNER_SPACING) / 2,
        alignItems: 'center',
    },
    bannerContainer: {
        width: BANNER_WIDTH,
        height: 224,
        borderRadius: 16,
        overflow: 'hidden',
        marginHorizontal: BANNER_SPACING / 2,
    },
    banner: {
        width: '100%',
        height: '100%',
    },
    dotsContainer: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotActive: {
        backgroundColor: '#1f2937',
    },
    dotInactive: {
        backgroundColor: '#d1d5db',
    },
});
