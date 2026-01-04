import { View, StyleSheet, ScrollView, StatusBar as RNStatusBar, RefreshControl, Text, Pressable, Dimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { useStoryViewer } from '../../src/presentation/hooks/useStoryViewer';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import Video from 'react-native-video';
import { Image } from 'expo-image';
import { VideoCacheService } from '../../src/data/services/VideoCacheService';

// Icons
import LikeIcon from '../../assets/icons/like.svg';
import SaveIcon from '../../assets/icons/save.svg';
import ShareIcon from '../../assets/icons/share.svg';
import ShoppingIcon from '../../assets/icons/shopping.svg';
import MoreIcon from '../../assets/icons/more.svg';

// New Components
import { TrendingHeader } from '../../src/presentation/components/explore/TrendingHeader';
import { FilterBar } from '../../src/presentation/components/explore/FilterBar';
import { StoryRail } from '../../src/presentation/components/explore/StoryRail';
import { TrendingCarousel } from '../../src/presentation/components/explore/TrendingCarousel';
import { MasonryFeed } from '../../src/presentation/components/explore/MasonryFeed';
import { useActiveVideoStore } from '../../src/presentation/store/useActiveVideoStore';
import { SwipeWrapper } from '../../src/presentation/components/shared/SwipeWrapper';
import { LIGHT_COLORS, DARK_COLORS } from '../../src/core/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CATEGORIES = ['Senin İçin', 'Takip Edilen', 'Popüler'];

// Preview Modal Component
const PreviewModal = ({ item, onClose }: { item: { id: string; thumbnailUrl: string; videoUrl: string; username?: string; fullName?: string; avatarUrl?: string }; onClose: () => void }) => {
    const [videoSource, setVideoSource] = useState<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [showPoster, setShowPoster] = useState(true);

    useEffect(() => {
        let isCancelled = false;
        const initSource = async () => {
            // Check cache first for instant load
            const cachedPath = await VideoCacheService.getCachedVideoPath(item.videoUrl);
            if (!isCancelled) {
                setVideoSource(cachedPath ? { uri: cachedPath } : { uri: item.videoUrl });
            }
        };
        initSource();
        return () => { isCancelled = true; };
    }, [item.videoUrl]);

    return (
        <Pressable 
            style={styles.previewOverlay} 
            onPress={onClose} 
            onPressOut={onClose}
        >
            <View style={styles.previewCard}>
                {/* Top Info Section - Strictly Aligned */}
                <View style={styles.previewHeader}>
                    <View style={styles.previewUserHeader}>
                        {item.avatarUrl && (
                            <Image source={{ uri: item.avatarUrl }} style={styles.previewAvatar} />
                        )}
                        <View style={styles.previewNameContainer}>
                            <Text style={styles.previewFullName} numberOfLines={1}>
                                {item.fullName || 'WizyClub User'}
                            </Text>
                            <Text style={styles.previewUserHandle} numberOfLines={1}>
                                @{item.username || 'wizyclub'}
                            </Text>
                        </View>
                    </View>
                    
                    {/* More Icon - Shifted significantly to the left */}
                    <MoreIcon 
                        width={28} 
                        height={28} 
                        color="#fff" 
                        style={{ transform: [{ rotate: '90deg' }], marginRight: 40 }} 
                    />
                </View>

                {/* Video Area - 0 border internally, clipped by container */}
                <View style={styles.videoContainer}>
                    {showPoster && (
                        <Image
                            source={{ uri: item.thumbnailUrl }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            priority="high"
                        />
                    )}
                    
                    {videoSource && (
                        <Video
                            source={videoSource}
                            style={[styles.previewVideo, { opacity: isReady ? 1 : 0 }]}
                            resizeMode="cover"
                            repeat={true}
                            paused={false}
                            muted={true}
                            onReadyForDisplay={() => {
                                setIsReady(true);
                                requestAnimationFrame(() => setShowPoster(false));
                            }}
                        />
                    )}
                </View>

                {/* Bottom Info Section - Action Buttons */}
                <View style={[styles.previewInfoSection, styles.previewActionRow]}>
                    <LikeIcon width={32} height={32} color="#fff" />
                    <SaveIcon width={32} height={32} color="#fff" />
                    <ShareIcon width={32} height={32} color="#fff" />
                    <ShoppingIcon width={32} height={32} color="#fff" />
                </View>
            </View>
        </Pressable>
    );
};

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
    const [previewItem, setPreviewItem] = useState<{ id: string; thumbnailUrl: string; videoUrl: string; username?: string; fullName?: string; avatarUrl?: string } | null>(null);

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

    const showPreview = (item: any) => setPreviewItem(item);
    const hidePreview = () => setPreviewItem(null);

    const trendingData = videos.slice(0, 5).map(v => ({
        id: v.id,
        title: v.description || "Video Başlığı",
        username: v.user.username,
        fullName: v.user.fullName,
        avatarUrl: v.user.avatarUrl,
        thumbnailUrl: v.thumbnailUrl,
        videoUrl: v.videoUrl,
        views: '1.6k',
        comments: '1.1k'
    }));

    // 🔥 FIX: Use real story data from useStoryViewer
    const { stories: storyListData } = useStoryViewer();

    // Group stories by user
    const storyCreatorsMap = new Map();
    storyListData.forEach(story => {
        const existing = storyCreatorsMap.get(story.user.id);
        if (!existing) {
            storyCreatorsMap.set(story.user.id, {
                id: story.user.id,
                username: story.user.username,
                avatarUrl: story.user.avatarUrl,
                hasUnseen: !story.isViewed
            });
        } else {
            // If ANY story is unseen, mark hasUnseen as true
            if (!story.isViewed) {
                existing.hasUnseen = true;
            }
        }
    });

    // If we have stories, show them.
    let creators = Array.from(storyCreatorsMap.values());

    const discoveryItems = videos.map((v, i) => ({
        id: v.id,
        thumbnailUrl: v.thumbnailUrl,
        videoUrl: v.videoUrl,
        views: '1.2k',
        username: v.user.username,
        fullName: v.user.fullName,
        avatarUrl: v.user.avatarUrl,
        isLarge: i % 3 === 0
    }));

    return (
        <>
            <SwipeWrapper
                onSwipeLeft={() => router.push('/deals')}
                onSwipeRight={() => router.push('/')}
                edgeOnly={true}
            >
                <View style={[styles.container, { backgroundColor: bgBody }]}>
                    <TrendingHeader
                        title="Şimdi Keşfet"
                        isDark={isDark}
                        showSearch={false}
                    />

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#fff" : "#000"} />
                        }
                    >
                        {/* Filter Bar */}
                        <FilterBar
                            categories={CATEGORIES}
                            selectedCategory={selectedCategory}
                            onSelect={setSelectedCategory}
                            isDark={isDark}
                        />

                        {/* 1. Stories Section */}
                        {creators.length > 0 && (
                            <>
                                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>
                                    Hikayeler
                                </Text>
                                <StoryRail
                                    creators={creators}
                                    onCreatorPress={handleStoryPress}
                                    isDark={isDark}
                                />
                            </>
                        )}

                        {/* 2. Featured Carousel Section */}
                        <Text style={[styles.carouselTitle, { color: themeColors.textPrimary }]}>
                            Önerilenler
                        </Text>
                        <TrendingCarousel
                            data={trendingData}
                            onItemPress={handleVideoPress}
                            onPreview={showPreview}
                            onPreviewEnd={hidePreview}
                            isDark={isDark}
                        />

                        {/* 3. Masonry Grid */}
                        <MasonryFeed
                            data={discoveryItems}
                            onItemPress={handleVideoPress}
                            onPreview={showPreview}
                            onPreviewEnd={hidePreview}
                            isDark={isDark}
                        />
                    </ScrollView>
                </View>
            </SwipeWrapper>

            {previewItem && <PreviewModal item={previewItem} onClose={hidePreview} />}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    carouselTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 0,
        marginBottom: 8,
        paddingHorizontal: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 0,
        marginBottom: 8,
        paddingHorizontal: 12,
    },
    previewOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    previewCard: {
        width: '90%',
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
    },
    videoContainer: {
        width: '100%',
        height: 500, // Fixed video height
        backgroundColor: '#000',
    },
    previewVideo: {
        width: '100%',
        height: '100%',
    },
    previewInfoSection: {
        width: '100%',
        height: 56, // Fixed height matching top avatar (32) + 12px padding on each side
        justifyContent: 'center',
        paddingHorizontal: 15,
        backgroundColor: '#1a1a1a',
    },
    previewHeader: {
        width: '100%',
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 15,
        paddingRight: 20, // Increased padding to shift icon left
        backgroundColor: '#1a1a1a',
    },
    previewActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 35, // Increased padding to prevent touching edges but keep icons far apart
    },
    previewUserHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    previewAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    previewNameContainer: {
        flex: 1,
    },
    previewFullName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    previewUserHandle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13, // Slightly larger for readability
        fontWeight: '500',
    },
});

