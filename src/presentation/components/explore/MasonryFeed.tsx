import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Eye } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 50) / 2;

interface DiscoveryItem {
    id: string;
    thumbnailUrl: string;
    views: string;
    isLarge?: boolean;
}

interface MasonryFeedProps {
    data: DiscoveryItem[];
    onItemPress: (id: string) => void;
    isDark?: boolean;
}

export function MasonryFeed({ data, onItemPress, isDark = true }: MasonryFeedProps) {
    // Split data into two columns
    const leftCol = data.filter((_, i) => i % 2 === 0);
    const rightCol = data.filter((_, i) => i % 2 !== 0);

    const renderItem = (item: DiscoveryItem) => {
        const height = item.isLarge ? 300 : 200;

        return (
            <TouchableOpacity
                key={item.id}
                style={[styles.item, { height }]}
                onPress={() => onItemPress(item.id)}
            >
                <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={styles.thumbnail}
                    contentFit="cover"
                />
                <View style={styles.statsBadge}>
                    <Eye size={10} color="white" />
                    <Text style={styles.statsText}>{item.views}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.column}>
                {leftCol.map(renderItem)}
            </View>
            <View style={styles.column}>
                {rightCol.map(renderItem)}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        paddingHorizontal: 1,
        gap: 1,
        paddingBottom: 100,
    },
    column: {
        flex: 1,
        gap: 1,
    },
    item: {
        width: '100%',
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        position: 'relative',
    },
    thumbnail: {
        ...StyleSheet.absoluteFillObject,
    },
    statsBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statsText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
    },
});
