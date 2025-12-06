import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { MasonryList } from '../../src/presentation/components/explore/MasonryList';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';

const CATEGORIES = ['For You', 'Trending', 'Food', 'Travel', 'Tech', 'Art', 'Music'];

export default function ExploreScreen() {
    const insets = useSafeAreaInsets();
    const { videos } = useVideoFeed(); // Reuse feed data for demo

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Search Bar */}
            <View style={styles.header}>
                <View style={styles.searchBar}>
                    {/* @ts-ignore */}
                    <Search size={20} color="#888" />
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
                        <View key={index} style={[styles.categoryChip, index === 0 && styles.activeChip]}>
                            <Text style={[styles.categoryText, index === 0 && styles.activeCategoryText]}>{cat}</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* Grid */}
            <MasonryList videos={videos} />
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
});
