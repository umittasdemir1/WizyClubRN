import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Eye } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 2;
const PADDING = 2;
// 3 columns
const COLUMN_WIDTH = (SCREEN_WIDTH - (PADDING * 2) - (GAP * 2)) / 3;

// Aspect Ratios: Squares are 1:1, Large matches the stack height
const SMALL_HEIGHT = COLUMN_WIDTH; // 1:1 Square
// Calculate Large Height to perfectly match 2 stacked small items + gap
const LARGE_HEIGHT = (SMALL_HEIGHT * 2) + GAP;

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

    // Chunk data into groups of 5 (1 Large + 2 Small + 2 Small)
    const chunks = [];
    for (let i = 0; i < data.length; i += 5) {
        chunks.push(data.slice(i, i + 5));
    }

    const renderLargeItem = (item: DiscoveryItem) => (
        <TouchableOpacity
            key={item.id}
            style={[styles.item, { width: COLUMN_WIDTH, height: LARGE_HEIGHT }]}
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

    const renderSmallItem = (item: DiscoveryItem) => (
        <TouchableOpacity
            key={item.id}
            style={[styles.item, { width: COLUMN_WIDTH, height: SMALL_HEIGHT }]}
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

    const SmallColumn = ({ items }: { items: DiscoveryItem[] }) => (
        <View style={[styles.columnWrapper, { gap: GAP }]}>
            {items.map(item => renderSmallItem(item))}
        </View>
    );

    return (
        <View style={styles.container}>
            {chunks.map((chunk, rowIndex) => {
                const isEvenRow = rowIndex % 2 === 0;

                // We need at least 1 item to render a row
                if (chunk.length === 0) return null;

                const largeItem = chunk[0];
                const col2Items = chunk.slice(1, 3);
                const col3Items = chunk.slice(3, 5);

                const LargeColumn = () => (
                    <View style={styles.columnWrapper}>
                        {renderLargeItem(largeItem)}
                    </View>
                );

                // Row Even: [Large] [Small] [Small]
                // Row Odd:  [Small] [Small] [Large]

                return (
                    <View key={rowIndex} style={[styles.row, { marginBottom: GAP }]}>
                        {isEvenRow ? (
                            <>
                                <LargeColumn />
                                {col2Items.length > 0 && <SmallColumn items={col2Items} />}
                                {col3Items.length > 0 && <SmallColumn items={col3Items} />}
                            </>
                        ) : (
                            <>
                                {col2Items.length > 0 && <SmallColumn items={col2Items} />}
                                {col3Items.length > 0 && <SmallColumn items={col3Items} />}
                                <LargeColumn />
                            </>
                        )}
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: PADDING,
        paddingBottom: 100,
    },
    row: {
        flexDirection: 'row',
        gap: GAP,
    },
    columnWrapper: {
        flexDirection: 'column',
    },
    item: {
        borderRadius: 0,
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
