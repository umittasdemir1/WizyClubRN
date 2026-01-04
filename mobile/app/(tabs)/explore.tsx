import { View, StyleSheet, ScrollView, StatusBar as RNStatusBar, RefreshControl, Text, Pressable, Dimensions, PanResponder } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { useStoryViewer } from '../../src/presentation/hooks/useStoryViewer';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import Video from 'react-native-video';
import { Image } from 'expo-image';
import { VideoCacheService } from '../../src/data/services/VideoCacheService';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

// Icons
import LikeIcon from '../../assets/icons/like.svg';
import SaveIcon from '../../assets/icons/save.svg';
import ShareIcon from '../../assets/icons/share.svg';
import ShoppingIcon from '../../assets/icons/shopping.svg';

// New Components
import { TrendingHeader } from '../../src/presentation/components/explore/TrendingHeader';
import { FilterBar } from '../../src/presentation/components/explore/FilterBar';
import { StoryRail } from '../../src/presentation/components/explore/StoryRail';
import { TrendingCarousel } from '../../src/presentation/components/explore/TrendingCarousel';
import { MasonryFeed } from '../../src/presentation/components/explore/MasonryFeed';
import { useActiveVideoStore } from '../../src/presentation/store/useActiveVideoStore';
import { SwipeWrapper } from '../../src/presentation/components/shared/SwipeWrapper';
import { LIGHT_COLORS, DARK_COLORS } from '../../src/core/constants';

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

// Preview Modal Component
const PreviewModal = ({ item, onClose, onAction }: PreviewModalProps) => {
    const [videoSource, setVideoSource] = useState<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [showPoster, setShowPoster] = useState(true);
    const [activeAction, setActiveAction] = useState<'like' | 'save' | 'share' | 'shop' | null>(null);
    
    // Store button layout coordinates for hit detection
    const layouts = useRef<Record<string, { x: number, y: number, width: number, height: number }>>({});

    useEffect(() => {
        let isCancelled = false;
        const initSource = async () => {
            const cachedPath = await VideoCacheService.getCachedVideoPath(item.videoUrl);
            if (!isCancelled) {
                setVideoSource(cachedPath ? { uri: cachedPath } : { uri: item.videoUrl });
            }
        };
        initSource();
        return () => { isCancelled = true; };
    }, [item.videoUrl]);

    // PanResponder to track sliding finger
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (evt, gestureState) => {
                const { moveX, moveY } = gestureState;
                let foundAction: any = null;

                // Simple hit detection
                Object.entries(layouts.current).forEach(([type, layout]) => {
                    if (
                        moveX >= layout.x && 
                        moveX <= layout.x + layout.width &&
                        moveY >= layout.y && 
                        moveY <= layout.y + layout.height
                    ) {
                        foundAction = type;
                    }
                });
                setActiveAction(foundAction);
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (activeAction) {
                    onAction?.(activeAction, item.id);
                }
                onClose();
            },
            onPanResponderTerminate: onClose,
        })
    ).current;

    const handleLayout = (type: string) => (event: any) => {
        // Measure position relative to screen for accurate tracking
        event.target.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
            layouts.current[type] = { x: pageX, y: pageY, width, height };
        });
    };

    return (
        <View style={styles.previewOverlay} {...panResponder.panHandlers}>
            <Animated.View style={styles.previewCard}>
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
                            muted={true}
                            onReadyForDisplay={() => {
                                setIsReady(true);
                                requestAnimationFrame(() => setShowPoster(false));
                            }}
                        />
                    )}
                </View>

                {/* Action Row - Detects slide-over */}
                <View style={[styles.previewInfoSection, styles.previewActionRow]}>
                    <View 
                        onLayout={handleLayout('like')} 
                        style={[styles.iconWrapper, activeAction === 'like' && styles.activeIcon]}
                    >
                        <LikeIcon width={32} height={32} color={activeAction === 'like' ? '#FF2146' : '#fff'} />
                    </View>
                    <View 
                        onLayout={handleLayout('save')} 
                        style={[styles.iconWrapper, activeAction === 'save' && styles.activeIcon]}
                    >
                        <SaveIcon width={32} height={32} color={activeAction === 'save' ? '#FFD700' : '#fff'} />
                    </View>
                    <View 
                        onLayout={handleLayout('share')} 
                        style={[styles.iconWrapper, activeAction === 'share' && styles.activeIcon]}
                    >
                        <ShareIcon width={32} height={32} color={activeAction === 'share' ? '#00C6FF' : '#fff'} />
                    </View>
                    <View 
                        onLayout={handleLayout('shop')} 
                        style={[styles.iconWrapper, activeAction === 'shop' && styles.activeIcon]}
                    >
                        <ShoppingIcon width={32} height={32} color={activeAction === 'shop' ? '#4CD964' : '#fff'} />
                    </View>
                </View>
            </Animated.View>
        </View>
    );
};

export default function ExploreScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { videos, refreshFeed, toggleLike, toggleSave, toggleShare, toggleShop } = useVideoFeed();
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
        height: 56,
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
        paddingHorizontal: 35,
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
});

