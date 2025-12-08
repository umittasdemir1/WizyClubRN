import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { Image } from 'expo-image';
import { Video } from '../../src/domain/entities/Video';

const CATEGORIES = ['For You', 'Trending', 'Food', 'Travel', 'Tech', 'Art', 'Music'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = (SCREEN_WIDTH - 40) / 2;

export default function ExploreScreen() {
    const insets = useSafeAreaInsets();
    const { videos } = useVideoFeed();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Search Bar */}
            <View style={styles.header}>
                <View style={styles.searchBar}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        placeholder="Search WizyClub"
                        placeholderTextColor="#888"
                        style={styles.input}
                    />
                </View>
            </View>

            {/* Categories */}
            <View style={styles.categoriesContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
                    {CATEGORIES.map((cat, index) => (
                        <TouchableOpacity key={index} style={[styles.categoryChip, index === 0 && styles.activeChip]}>
                            <Text style={[styles.categoryText, index === 0 && styles.activeCategoryText]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Simple Grid */}
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.videoGrid}>
                    {videos.map((video) => (
                        <TouchableOpacity key={video.id} style={styles.videoItem}>
                            <Image
                                source={{ uri: video.thumbnailUrl }}
                                style={styles.videoThumbnail}
                                contentFit="cover"
                            />
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 40,
    },
    searchIcon: {
        fontSize: 16,
    },
    input: {
        flex: 1,
        color: 'white',
        marginLeft: 8,
        fontSize: 16,
    },
    categoriesContainer: {
        height: 50,
    },
    categoriesContent: {
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 12,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#333',
    },
    activeChip: {
        backgroundColor: 'white',
        borderColor: 'white',
    },
    categoryText: {
        color: 'white',
        fontWeight: '600',
    },
    activeCategoryText: {
        color: 'black',
    },
    videoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    videoItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE * 1.4,
        margin: 4,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#222',
    },
    videoThumbnail: {
        width: '100%',
        height: '100%',
    },
});
