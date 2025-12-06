import { MasonryFlashList } from '@shopify/flash-list';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Video } from '../../../domain/entities/Video';
import { useRouter } from 'expo-router';

interface MasonryListProps {
    videos: Video[];
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (SCREEN_WIDTH - 32) / COLUMN_COUNT; // 16px padding total

export function MasonryList({ videos }: MasonryListProps) {
    const router = useRouter();

    const renderItem = ({ item, index }: { item: Video, index: number }) => {
        // Simulate different heights for masonry effect
        const height = index % 3 === 0 ? 250 : index % 2 === 0 ? 300 : 200;

        return (
            <Pressable
                style={[styles.item, { height, width: ITEM_WIDTH }]}
                onPress={() => {
                    // Navigate to feed or open video
                    // For now, just log or maybe navigate to a detail view if we had one
                    console.log('Pressed video', item.id);
                }}
            >
                <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={{ flex: 1, borderRadius: 8 }}
                    contentFit="cover"
                    transition={200}
                />
            </Pressable>
        );
    };

    return (
        <View style={styles.container}>
            <MasonryFlashList
                data={videos}
                numColumns={COLUMN_COUNT}
                renderItem={renderItem}
                estimatedItemSize={250}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 8 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    item: {
        margin: 4,
        backgroundColor: '#333',
        borderRadius: 8,
    },
});
