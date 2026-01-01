import { View, StyleSheet, ScrollView, StatusBar as RNStatusBar, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';

// New Components
import { TrendingHeader } from '../../src/presentation/components/explore/TrendingHeader';
import { FilterBar } from '../../src/presentation/components/explore/FilterBar';
import { StoryRail } from '../../src/presentation/components/explore/StoryRail';
import { TrendingCarousel } from '../../src/presentation/components/explore/TrendingCarousel';
import { MasonryFeed } from '../../src/presentation/components/explore/MasonryFeed';
import { useActiveVideoStore } from '../../src/presentation/store/useActiveVideoStore';
import { SwipeWrapper } from '../../src/presentation/components/shared/SwipeWrapper';
import { LIGHT_COLORS, DARK_COLORS } from '../../src/core/constants';

const CATEGORIES = ['Senin İçin', 'Takip Edilen', 'Popüler'];

export default function ExploreScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { videos, refreshFeed } = useVideoFeed();
    const isDark = useThemeStore((state) => state.isDark);
    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const bgBody = themeColors.background;
    const setActiveVideo = useActiveVideoStore((state) => state.setActiveVideo);

    const [selectedCategory, setSelectedCategory] = useState('Senin İçin');
    const [refreshing, setRefreshing] = useState(false);

    // Imperative StatusBar Control
    useFocusEffect(
        useCallback(() => {
            RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
        }, [isDark])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshFeed();
        setRefreshing(false);
    }, [refreshFeed]);

    const handleVideoPress = (id: string) => {
        // Encontra o index do vídeo no feed
        const index = videos.findIndex(v => v.id === id);
        if (index !== -1) {
            setActiveVideo(id, index);
        }
        router.push('/');
    };

    const handleStoryPress = (id: string) => {
        router.push(`/story/${id}`);
    };

    const trendingData = videos.slice(0, 5).map(v => ({
        id: v.id,
        title: v.description || "Video Başlığı",
        username: v.user.username,
        avatarUrl: v.user.avatarUrl,
        thumbnailUrl: v.thumbnailUrl,
        views: '1.6k',
        comments: '1.1k'
    }));

    // 🔥 FIX: Deduplicate users and use User ID instead of Video ID
    const uniqueUsers = new Map();
    videos.forEach(v => {
        if (!uniqueUsers.has(v.user.id)) {
            uniqueUsers.set(v.user.id, {
                id: v.user.id, // User ID used for navigation
                username: v.user.username,
                avatarUrl: v.user.avatarUrl,
                hasUnseen: Math.random() > 0.5 // Mock data kept as is
            });
        }
    });

    const creators = Array.from(uniqueUsers.values()).slice(0, 10);

    const discoveryItems = videos.map((v, i) => ({
        id: v.id,
        thumbnailUrl: v.thumbnailUrl,
        views: '1.2k',
        isLarge: i % 3 === 0
    }));

    return (
        <SwipeWrapper
            onSwipeLeft={() => router.push('/deals')}
            onSwipeRight={() => router.push('/')}
            edgeOnly={true}
        >
            <View style={[styles.container, { backgroundColor: bgBody }]}>
                <TrendingHeader
                    isDark={isDark}
                    onSearchPress={() => console.log('Search')}
                />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#fff" : "#000"} />
                    }
                >
                    {/* 1. Featured Carousel */}
                    <TrendingCarousel
                        data={trendingData}
                        onItemPress={handleVideoPress}
                        isDark={isDark}
                    />

                    {/* 2. Filter Bar */}
                    <FilterBar
                        categories={CATEGORIES}
                        selectedCategory={selectedCategory}
                        onSelect={setSelectedCategory}
                        isDark={isDark}
                    />

                    {/* 3. Stories Row */}
                    <StoryRail
                        creators={creators}
                        onCreatorPress={handleStoryPress}
                        isDark={isDark}
                    />

                    {/* 4. Masonry Grid */}
                    <MasonryFeed
                        data={discoveryItems}
                        onItemPress={handleVideoPress}
                        isDark={isDark}
                    />
                </ScrollView>
            </View>
        </SwipeWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
