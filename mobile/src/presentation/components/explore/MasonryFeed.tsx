import React from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { VideoTabIcon } from '../shared/VideoTabIcon';
import { CarouselIcon } from '../shared/CarouselIcon';
import { PhotoIcon } from '../shared/PhotoIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 2;
const PADDING = 0;
// 2 columns
const COLUMN_WIDTH = (SCREEN_WIDTH - GAP) / 2;
const ITEM_HEIGHT = (COLUMN_WIDTH * 5) / 4;
const ICON_SIZE = 28;
const ICON_BG_SIZE = 34;

interface DiscoveryItem {
    id: string;
    thumbnailUrl: string;
    videoUrl?: string;
    mediaType?: 'video' | 'carousel' | 'photo';
}

interface MasonryFeedProps {
    data: DiscoveryItem[];
    onItemPress: (id: string) => void;
    onPreview?: (item: DiscoveryItem) => void;
    isDark?: boolean;
}

export function MasonryFeed({ data, onItemPress, onPreview, isDark = true }: MasonryFeedProps) {
    const itemBg = isDark ? '#222222' : '#F2F2F7';

    return (
        <View style={styles.container}>
            {data.map((item, index) => (
                <Pressable
                    key={item.id}
                    style={[
                        styles.item,
                        {
                            width: COLUMN_WIDTH,
                            marginRight: index % 2 === 0 ? GAP : 0,
                            marginBottom: GAP,
                            backgroundColor: itemBg,
                        },
                    ]}
                    onPress={() => onItemPress(item.id)}
                    onLongPress={item.videoUrl ? () => onPreview?.(item) : undefined}
                    delayLongPress={300}
                >
                    <Image
                        source={{ uri: item.thumbnailUrl }}
                        style={styles.thumbnail}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={0}
                        priority="high"
                    />
                    {item.mediaType ? (
                        <View style={styles.iconWrapper}>
                            <View style={styles.iconBubble}>
                                {item.mediaType === 'video' ? (
                                    <VideoTabIcon size={ICON_SIZE} color="#FFFFFF" />
                                ) : item.mediaType === 'carousel' ? (
                                    <CarouselIcon size={ICON_SIZE} color="#FFFFFF" />
                                ) : (
                                    <PhotoIcon size={ICON_SIZE} color="#FFFFFF" />
                                )}
                            </View>
                        </View>
                    ) : null}
                </Pressable>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: PADDING,
        paddingBottom: 100,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    item: {
        borderRadius: 0,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        position: 'relative',
        height: ITEM_HEIGHT,
    },
    thumbnail: {
        ...StyleSheet.absoluteFillObject,
    },
    iconWrapper: {
        position: 'absolute',
        right: 6,
        top: 6,
        width: ICON_BG_SIZE,
        height: ICON_BG_SIZE,
        borderRadius: 6,
    },
    iconBubble: {
        width: '100%',
        height: '100%',
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
});
