import { View, StyleSheet, ScrollView, RefreshControl, Text, Pressable, Dimensions, Modal } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useCallback, useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { useStoryViewer } from '../../src/presentation/hooks/useStoryViewer';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import Video from 'react-native-video';
import { Image } from 'expo-image';
import { Skeleton } from 'moti/skeleton';
import { VideoCacheService } from '../../src/data/services/VideoCacheService';
import { useMuteControls } from '../../src/presentation/store/useActiveVideoStore';
import { Volume2, VolumeX } from 'lucide-react-native';
import { LIGHT_COLORS, DARK_COLORS } from '../../src/core/constants';

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
import { SystemBars } from 'react-native-edge-to-edge';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CATEGORIES = ['Senin İçin', 'Takip Edilen', 'Popüler'];

interface PreviewModalProps {
    item: {
        id: string;
        thumbnailUrl: string;
        videoUrl: string;
        username?: string;
        fullName?: string;
        avatarUrl?: string
    };
    onClose: () => void;
    onAction?: (type: 'like' | 'save' | 'share' | 'shop', id: string) => void;
}

// Preview Modal Component - Tap outside to close, tap buttons to action
const PreviewModal = ({ item, onClose, onAction }: PreviewModalProps) => {
    const [videoSource, setVideoSource] = useState<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [showPoster, setShowPoster] = useState(true);
    const [likeActive, setLikeActive] = useState(false);
    const [saveActive, setSaveActive] = useState(false);
    const { isMuted, toggleMute } = useMuteControls();

    useEffect(() => {
        let isCancelled = false;
        const initSource = async () => {
            // First check if it's already cached
            const cachedPath = await VideoCacheService.getCachedVideoPath(item.videoUrl);
            if (!isCancelled) {
                if (cachedPath) {
                    setVideoSource({ uri: cachedPath });
                } else {
                    // Start full download if not cached, but stream in the meantime
                    setVideoSource({ uri: item.videoUrl });
                    VideoCacheService.cacheVideo(item.videoUrl).then(newPath => {
                        if (!isCancelled && newPath) {
                            setVideoSource({ uri: newPath });
                        }
                    });
                }
            }
        };
        initSource();
        return () => { isCancelled = true; };
    }, [item.videoUrl]);

    // Action button handler with haptic feedback and Feed-style animation
    const handleAction = useCallback((type: 'like' | 'save' | 'share' | 'shop') => {
        try {
            require('expo-haptics').impactAsync(
                require('expo-haptics').ImpactFeedbackStyle.Medium
            );
        } catch { }

        // Toggle active state for like/save
        if (type === 'like') setLikeActive(prev => !prev);
        if (type === 'save') setSaveActive(prev => !prev);

        onAction?.(type, item.id);
    }, [item.id, onAction]);

    return (
        <Modal transparent visible={true} animationType="fade" onRequestClose={onClose}>
            {/* Tap overlay to close */}
            <Pressable style={styles.previewOverlay} onPress={onClose}>
                {/* Card - prevent tap from closing */}
                <Pressable style={styles.previewCard} onPress={(e) => e.stopPropagation()}>
                    {/* Top Info Section */}
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
                        <Pressable onPress={onClose}>
                            <MoreIcon width={32} height={32} color="#fff" />
                        </Pressable>
                    </View>

                    {/* Video Area */}
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
                                muted={isMuted}
                                onReadyForDisplay={() => {
                                    setIsReady(true);
                                    requestAnimationFrame(() => setShowPoster(false));
                                }}
                            />
                        )}

                        {/* Volume Control Button */}
                        <Pressable
                            style={styles.previewVolumeBtn}
                            onPress={toggleMute}
                        >
                            {isMuted ? (
                                <VolumeX size={20} color="#FFFFFF" />
                            ) : (
                                <Volume2 size={20} color="#FFFFFF" />
                            )}
                        </Pressable>
                    </View>

                    {/* Action Row - Plain icons with color change on press */}
                    <View style={[styles.previewInfoSection, styles.previewActionRow]}>
                        <Pressable
                            style={styles.iconWrapper}
                            onPress={() => handleAction('like')}
                        >
                            <LikeIcon width={32} height={32} color={likeActive ? '#FF2146' : '#fff'} />
                        </Pressable>

                        <Pressable
                            style={styles.iconWrapper}
                            onPress={() => handleAction('save')}
                        >
                            <SaveIcon width={32} height={32} color={saveActive ? '#FFD700' : '#fff'} />
                        </Pressable>

                        <Pressable
                            style={styles.iconWrapper}
                            onPress={() => handleAction('share')}
                        >
                            <ShareIcon width={32} height={32} color="#fff" />
                        </Pressable>

                        <Pressable
                            style={styles.iconWrapper}
                            onPress={() => handleAction('shop')}
                        >
                            <ShoppingIcon width={32} height={32} color="#fff" />
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

export default function ExploreScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const isFocused = useIsFocused();
    const { videos, isLoading, refreshFeed, toggleLike, toggleSave, toggleShare, toggleShop } = useVideoFeed();
    const isDark = useThemeStore((state) => state.isDark);
    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const bgBody = themeColors.background;
    const setActiveVideo = useActiveVideoStore((state) => state.setActiveVideo);

    const [selectedCategory, setSelectedCategory] = useState('Senin İçin');
    const [refreshing, setRefreshing] = useState(false);
    const [previewItem, setPreviewItem] = useState<{ id: string; thumbnailUrl: string; videoUrl: string; username?: string; fullName?: string; avatarUrl?: string } | null>(null);
    const showSkeleton = videos.length === 0 || isLoading;
    const skeletonMode = isDark ? 'dark' : 'light';
    const carouselItemWidth = SCREEN_WIDTH * 0.38;
    const carouselItemHeight = carouselItemWidth * (16 / 9);
    const gridGap = 2;
    const gridPadding = 2;
    const gridColumnWidth = (SCREEN_WIDTH - (gridPadding * 2) - (gridGap * 2)) / 3;
    const gridSmallHeight = gridColumnWidth;
    const gridLargeHeight = (gridSmallHeight * 2) + gridGap;

    useFocusEffect(
        useCallback(() => {
            SystemBars.setStyle({
                statusBar: isDark ? 'light' : 'dark',
                navigationBar: isDark ? 'light' : 'dark',
            });
        }, [isDark])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshFeed();
        setRefreshing(false);
    }, [refreshFeed]);

    const handleVideoPress = (id: string) => {
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

    const handlePreviewAction = (type: 'like' | 'save' | 'share' | 'shop', id: string) => {
        switch (type) {
            case 'like': toggleLike(id); break;
            case 'save': toggleSave(id); break;
            case 'share': toggleShare(id); break;
            case 'shop': toggleShop?.(id); break;
        }
    };

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

    const { stories: storyListData } = useStoryViewer();

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
            if (!story.isViewed) {
                existing.hasUnseen = true;
            }
        }
    });

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
                onSwipeLeft={previewItem ? undefined : () => router.push('/deals')}
                onSwipeRight={previewItem ? undefined : () => router.push('/')}
                edgeOnly={!!previewItem}
            >
                <View style={[styles.container, { backgroundColor: bgBody }]}>
                    <TrendingHeader
                        title="Şimdi Keşfet"
                        isDark={isDark}
                        showSearch={false}
                    />

                    <ScrollView
                        scrollEnabled={!previewItem}
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
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.carouselTitle, { color: themeColors.textPrimary }]}>
                                Önerilenler
                            </Text>
                            <MoreIcon width={24} height={24} color={isDark ? '#FFFFFF' : '#000000'} />
                        </View>
                        {showSkeleton ? (
                            <View style={styles.carouselSkeletonContainer}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.carouselSkeletonRow}
                                >
                                    {[0, 1, 2].map((index) => (
                                        <Skeleton
                                            key={`carousel-skeleton-${index}`}
                                            colorMode={skeletonMode}
                                            width={carouselItemWidth}
                                            height={carouselItemHeight}
                                            radius={10}
                                            style={styles.carouselSkeletonCard}
                                        />
                                    ))}
                                    <View style={{ width: SCREEN_WIDTH - carouselItemWidth - 24 }} />
                                </ScrollView>
                            </View>
                        ) : (
                            <TrendingCarousel
                                data={trendingData}
                                onItemPress={handleVideoPress}
                                onPreview={showPreview}
                                onPreviewEnd={hidePreview}
                                isDark={isDark}
                                scrollEnabled={!previewItem}
                                isPreviewActive={!!previewItem}
                                isScreenFocused={isFocused}
                            />
                        )}

                        {/* 3. Masonry Grid */}
                        {showSkeleton ? (
                            <View style={[styles.gridSkeletonContainer, { paddingHorizontal: gridPadding }]}>
                                {[0, 1].map((rowIndex) => {
                                    const isEvenRow = rowIndex % 2 === 0;
                                    const LargeColumn = (
                                        <View key={`large-${rowIndex}`} style={styles.gridSkeletonColumn}>
                                            <Skeleton
                                                colorMode={skeletonMode}
                                                width={gridColumnWidth}
                                                height={gridLargeHeight}
                                                radius={0}
                                                style={styles.gridSkeletonItem}
                                            />
                                        </View>
                                    );
                                    const SmallColumn = (keyPrefix: string) => (
                                        <View key={keyPrefix} style={[styles.gridSkeletonColumn, { gap: gridGap }]}>
                                            <Skeleton
                                                colorMode={skeletonMode}
                                                width={gridColumnWidth}
                                                height={gridSmallHeight}
                                                radius={0}
                                                style={styles.gridSkeletonItem}
                                            />
                                            <Skeleton
                                                colorMode={skeletonMode}
                                                width={gridColumnWidth}
                                                height={gridSmallHeight}
                                                radius={0}
                                                style={styles.gridSkeletonItem}
                                            />
                                        </View>
                                    );

                                    return (
                                        <View key={`row-${rowIndex}`} style={[styles.gridSkeletonRow, { marginBottom: gridGap }]}>
                                            {isEvenRow ? (
                                                <>
                                                    {LargeColumn}
                                                    {SmallColumn(`small-a-${rowIndex}`)}
                                                    {SmallColumn(`small-b-${rowIndex}`)}
                                                </>
                                            ) : (
                                                <>
                                                    {SmallColumn(`small-a-${rowIndex}`)}
                                                    {SmallColumn(`small-b-${rowIndex}`)}
                                                    {LargeColumn}
                                                </>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        ) : (
                            <MasonryFeed
                                data={discoveryItems}
                                onItemPress={handleVideoPress}
                                onPreview={showPreview}
                                onPreviewEnd={hidePreview}
                                isDark={isDark}
                            />
                        )}
                    </ScrollView>
                </View>
            </SwipeWrapper>

            {previewItem && (
                <PreviewModal
                    item={previewItem}
                    onClose={hidePreview}
                    onAction={handlePreviewAction}
                />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        marginBottom: 8,
    },
    carouselTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 0,
        marginBottom: 0,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 0,
        marginBottom: 8,
        paddingHorizontal: 12,
    },
    carouselSkeletonContainer: {
        height: 320,
        marginTop: -10,
    },
    carouselSkeletonRow: {
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    carouselSkeletonCard: {
        marginRight: 16,
        borderRadius: 10,
        overflow: 'hidden',
    },
    gridSkeletonContainer: {
        paddingBottom: 100,
    },
    gridSkeletonRow: {
        flexDirection: 'row',
        gap: 2,
    },
    gridSkeletonColumn: {
        flexDirection: 'column',
    },
    gridSkeletonItem: {
        borderRadius: 0,
        overflow: 'hidden',
    },
    previewOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    previewCard: {
        width: '95%',
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
    },
    videoContainer: {
        width: '100%',
        height: 600,
        backgroundColor: '#000',
        position: 'relative',
    },
    previewVideo: {
        width: '100%',
        height: '100%',
    },
    previewVolumeBtn: {
        position: 'absolute',
        bottom: 15,
        right: 15,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        borderRadius: 20,
        zIndex: 10,
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
        paddingHorizontal: 15,
        backgroundColor: '#1a1a1a',
    },
    previewActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 35, // Increased padding to prevent touching edges but keep icons far apart
    },
    iconWrapper: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
    },
    activeIcon: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        transform: [{ scale: 1.2 }],
    },
    previewUserHeader: {
        flex: 1,
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
        fontSize: 13,
        fontWeight: '500',
    },
    actionButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionLabel: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'center' as const,
    },
    hintText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        fontWeight: '500',
        marginTop: 20,
        textAlign: 'center' as const,
    },
});
