import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Play } from 'lucide-react-native';
import { Video } from '../../../domain/entities/Video';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GAP = 1;
const PADDING = 0;
const ITEM_WIDTH = Math.floor((SCREEN_WIDTH - (GAP * 2)) / 3);

interface ActivityGridProps {
    videos: Video[];
    isDark: boolean;
    onPress?: (video: Video, index: number) => void;
    onPreview?: (video: Video) => void;
    onPreviewEnd?: () => void;
}

export const ActivityGrid: React.FC<ActivityGridProps> = ({
    videos,
    isDark,
    onPress,
    onPreview,
    onPreviewEnd,
}) => {
    const bgColor = isDark ? '#1c1c1e' : '#f0f0f0';

    const formatViews = (views: number): string => {
        if (views >= 1000000) {
            return `${(views / 1000000).toFixed(1)}M`;
        } else if (views >= 1000) {
            return `${(views / 1000).toFixed(1)}k`;
        }
        return views.toString();
    };

    return (
        <View style={styles.container}>
            {videos.map((video, index) => (
                <Pressable
                    key={video.id}
                    style={[
                        styles.item,
                        { backgroundColor: bgColor },
                        index % 3 !== 2 && { marginRight: GAP },
                        { marginBottom: GAP },
                    ]}
                    onLongPress={() => onPreview?.(video)}
                    onPress={() => onPress?.(video, index)}
                    onPressOut={onPreviewEnd}
                >
                    <Image
                        source={{ uri: video.thumbnailUrl }}
                        style={styles.thumbnail}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                    <View style={styles.stats}>
                        <Play size={12} color="#fff" strokeWidth={2.5} />
                        <Text style={styles.viewsText}>{formatViews(video.likesCount || 0)}</Text>
                    </View>
                </Pressable>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: PADDING,
    },
    item: {
        width: ITEM_WIDTH,
        aspectRatio: 0.8, // 4:5
        position: 'relative',
        backgroundColor: '#1a1a1a',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    stats: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        zIndex: 2,
    },
    viewsText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});
