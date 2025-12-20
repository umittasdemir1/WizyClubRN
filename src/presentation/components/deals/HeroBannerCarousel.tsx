import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, ScrollView, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_PADDING = 16;
const BANNER_WIDTH = SCREEN_WIDTH - (BANNER_PADDING * 2);

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
    const scrollViewRef = useRef<ScrollView>(null);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / BANNER_WIDTH);
        setActiveIndex(index);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                snapToInterval={BANNER_WIDTH}
                decelerationRate="fast"
                contentContainerStyle={styles.scrollContent}
            >
                {banners.map((banner, index) => (
                    <TouchableOpacity
                        key={banner.id}
                        activeOpacity={0.9}
                        onPress={banner.onPress}
                        style={[
                            styles.bannerContainer,
                            index === 0 && styles.firstBanner,
                        ]}
                    >
                        <Image
                            source={{ uri: banner.imageUrl }}
                            style={styles.banner}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                        />
                    </TouchableOpacity>
                ))}
            </ScrollView>

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
        paddingRight: BANNER_PADDING,
    },
    bannerContainer: {
        width: BANNER_WIDTH,
        height: 224,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
    },
    firstBanner: {
        marginLeft: BANNER_PADDING,
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
