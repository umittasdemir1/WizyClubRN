import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { Image } from 'expo-image';
import MorphingDiscoveryBar from '../../src/presentation/components/discovery/MorphingDiscoveryBar';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';

const CATEGORIES = ['For You', 'Trending', 'Food', 'Travel', 'Tech', 'Art', 'Music'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = (SCREEN_WIDTH - 40) / 2;

import { StatusBar } from 'expo-status-bar';

export default function ExploreScreen() {
    // Insets handled by DiscoveryBar for top, but bottom might need handling
    const insets = useSafeAreaInsets();
    const { videos } = useVideoFeed();
    const isDark = useThemeStore((state) => state.isDark);
    const bgBody = isDark ? '#000000' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#000000';

    return (
        <View style={[styles.container, { paddingTop: 0, backgroundColor: bgBody }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            {/* Morphing Discovery Header - Handles top inset internally */}
            <MorphingDiscoveryBar />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
            >
                {/* Categories - Optional: Integrate into tabs or keep as sub-filter? 
                    Design implies DiscoveryBar tabs (Popular/Favorites) ARE the main filter. 
                    Maybe keep chips as sub-categories below? 
                */}
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
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: 'black', // Handled dynamically
    },
    categoriesContainer: {
        height: 50,
        marginVertical: 10,
    },
    categoriesContent: {
        paddingHorizontal: 16,
        alignItems: 'center', // Center vertically in container
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
