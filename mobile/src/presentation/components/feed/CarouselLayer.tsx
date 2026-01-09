import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Video from 'react-native-video';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CarouselItem {
    url: string;
    type: 'video' | 'image';
    thumbnail?: string;
}

interface CarouselLayerProps {
    mediaUrls: CarouselItem[];
    isActive: boolean;
    isMuted: boolean;
}

export function CarouselLayer({ mediaUrls, isActive, isMuted }: CarouselLayerProps) {
    const [activeIndex, setActiveIndex] = useState(0);

    return (
        <View style={styles.container}>
            <FlashList
                data={mediaUrls}
                renderItem={({ item, index }) => (
                    <CarouselMediaItem
                        item={item}
                        isActive={isActive && activeIndex === index}
                        isMuted={isMuted}
                    />
                )}
                keyExtractor={(item, index) => `${item.url}-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                estimatedItemSize={SCREEN_WIDTH}
                onMomentumScrollEnd={(e) => {
                    const offset = e.nativeEvent.contentOffset.x;
                    const index = Math.round(offset / SCREEN_WIDTH);
                    setActiveIndex(index);
                }}
                decelerationRate="fast"
                snapToInterval={SCREEN_WIDTH}
                snapToAlignment="start"
            />

            {/* Dots Indicator */}
            {mediaUrls.length > 1 && (
                <View style={[styles.indicatorContainer]}>
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
            )}
        </View>
    );
}

interface CarouselItemProps {
    item: CarouselItem;
    isActive: boolean;
    isMuted: boolean;
}

function CarouselMediaItem({ item, isActive, isMuted }: CarouselItemProps) {
    if (item.type === 'video') {
        return (
            <View style={styles.mediaContainer}>
                <Video
                    source={{ uri: item.url }}
                    style={styles.media}
                    resizeMode="cover"
                    repeat={true}
                    paused={!isActive}
                    muted={isMuted}
                    playInBackground={false}
                    playWhenInactive={false}
                    ignoreSilentSwitch="ignore"
                />
            </View>
        );
    }

    return (
        <View style={styles.mediaContainer}>
            <Image
                source={{ uri: item.url }}
                style={styles.media}
                contentFit="contain"
                cachePolicy="memory-disk"
                priority="high"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    mediaContainer: {
        width: SCREEN_WIDTH,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    media: {
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
        gap: 6,
        paddingVertical: 10,
        zIndex: 100,
    },
    dot: {
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    }
});
