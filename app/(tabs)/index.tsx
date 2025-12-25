import { FlashList } from '@shopify/flash-list';
import type { ViewToken } from 'react-native';
import {
    Dimensions,
    StyleSheet,
    View,
    ActivityIndicator,
    Text,
    RefreshControl,
    Platform,
    Alert,
    StatusBar as RNStatusBar,
    ScrollView,
    Pressable,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { VideoLayer } from '../../src/presentation/components/feed/VideoLayer';
import { ActionButtons } from '../../src/presentation/components/feed/ActionButtons';
import { HeaderOverlay } from '../../src/presentation/components/feed/HeaderOverlay';
import { MetadataLayer } from '../../src/presentation/components/feed/MetadataLayer';
import { DoubleTapLike, DoubleTapLikeRef } from '../../src/presentation/components/feed/DoubleTapLike';
import { BrightnessController } from '../../src/presentation/components/feed/BrightnessController';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { SideOptionsSheet } from '../../src/presentation/components/feed/SideOptionsSheet';
import { DeleteConfirmationModal } from '../../src/presentation/components/feed/DeleteConfirmationModal';
import { DescriptionSheet } from '../../src/presentation/components/feed/DescriptionSheet';
import {
    useActiveVideoStore,
    useAppStateSync,
    useMuteControls,
} from '../../src/presentation/store/useActiveVideoStore';
import { Video } from '../../src/domain/entities/Video';
import { useState, useRef, useCallback, useEffect, memo } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { FeedSkeleton } from '../../src/presentation/components/feed/FeedSkeleton';
import { UploadModal } from '../../src/presentation/components/feed/UploadModal';
import { useUploadStore } from '../../src/presentation/store/useUploadStore';

import { SwipeWrapper } from '../../src/presentation/components/shared/SwipeWrapper';
import { StoryBar } from '../../src/presentation/components/feed/StoryBar';

import { COLORS } from '../../src/core/constants';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Mock story users data
const MOCK_STORY_USERS = [
    { id: '1', username: 'zeynep.k', avatarUrl: 'https://i.pravatar.cc/150?img=1', hasUnseenStory: true },
    { id: '2', username: 'ahmet_y', avatarUrl: 'https://i.pravatar.cc/150?img=2', hasUnseenStory: true },
    { id: '3', username: 'elif.oz', avatarUrl: 'https://i.pravatar.cc/150?img=3', hasUnseenStory: false },
    { id: '4', username: 'mehmet.a', avatarUrl: 'https://i.pravatar.cc/150?img=4', hasUnseenStory: true },
    { id: '5', username: 'ayse_m', avatarUrl: 'https://i.pravatar.cc/150?img=5', hasUnseenStory: false },
    { id: '6', username: 'can.demir', avatarUrl: 'https://i.pravatar.cc/150?img=6', hasUnseenStory: true },
    { id: '7', username: 'selin.y', avatarUrl: 'https://i.pravatar.cc/150?img=7', hasUnseenStory: false },
    { id: '8', username: 'burak_k', avatarUrl: 'https://i.pravatar.cc/150?img=8', hasUnseenStory: true },
];

const VIEWABILITY_CONFIG = {
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 100,
};

export default function FeedScreen() {
    const {
        videos,
        isLoading,
        isRefreshing,
        isLoadingMore,
        hasMore,
        error,
        toggleLike,
        toggleSave,
        toggleFollow,
        toggleShare,
        toggleShop,
        refreshFeed,
        loadMore,
        deleteVideo,
    } = useVideoFeed();

    // Global Store
    const setActiveVideo = useActiveVideoStore((state) => state.setActiveVideo);
    const activeVideoId = useActiveVideoStore((state) => state.activeVideoId);
    const isAppActive = useActiveVideoStore((state) => state.isAppActive);
    const isSeeking = useActiveVideoStore((state) => state.isSeeking);
    const togglePause = useActiveVideoStore((state) => state.togglePause);
    const setScreenFocused = useActiveVideoStore((state) => state.setScreenFocused);
    // Upload Success -> Auto Scroll to Top
    const uploadStatus = useUploadStore(state => state.status);
    const uploadedVideoId = useUploadStore(state => state.uploadedVideoId);
    const resetUpload = useUploadStore(state => state.reset);

    // 1. Watch for upload success -> Trigger Refresh
    useEffect(() => {
        if (uploadedVideoId && uploadStatus === 'success') {
            console.log('🎉 Upload success detected, refreshing feed...');
            refreshFeed();
        }
    }, [uploadedVideoId, uploadStatus]);

    useEffect(() => {
        console.log(`[FeedScreen] Feed ready with ${videos.length} videos`);
    }, [videos]);

    // 2. Watch for video list update AFTER successful upload -> Scroll to top
    // We use a ref to track if a refresh was triggered by an upload
    const isUploadRefreshRef = useRef(false);
    useEffect(() => {
        if (uploadStatus === 'success') {
            isUploadRefreshRef.current = true;
        }
    }, [uploadStatus]);

    useEffect(() => {
        if (isUploadRefreshRef.current && !isRefreshing && videos.length > 0) {
            console.log('📊 Feed refreshed after upload. Scrolling to top...');

            // Check if the first video is indeed the one we just uploaded
            const isMatch = uploadedVideoId && videos[0].id === uploadedVideoId;

            // Scroll to top
            listRef.current?.scrollToIndex({ index: 0, animated: false });

            // Play it
            if (isMatch) {
                setActiveVideo(uploadedVideoId!, 0);
            } else {
                setActiveVideo(videos[0].id, 0);
            }

            // Cleanup
            isUploadRefreshRef.current = false;
            resetUpload();
        }
    }, [isRefreshing, videos, uploadedVideoId, setActiveVideo, resetUpload]);

    // Mute controls
    const { isMuted, toggleMute } = useMuteControls();

    // Tab State
    const [activeTab, setActiveTab] = useState<'stories' | 'foryou'>('foryou');

    // Upload State
    const [isUploadModalVisible, setUploadModalVisible] = useState(false);
    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
    const [isMoreSheetVisible, setMoreSheetVisible] = useState(false);
    const [isDescriptionSheetVisible, setDescriptionSheetVisible] = useState(false);
    // uploadedVideoId already declared above


    // App State Sync
    useAppStateSync();

    // Video progress - use SharedValues for high performance
    const isScrollingSV = useSharedValue(false);
    const videoSeekRef = useRef<((time: number) => void) | null>(null);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const listRef = useRef<any>(null);

    // Calculate video height - full screen for proper paging
    const ITEM_HEIGHT = Dimensions.get('window').height;

    // Imperative StatusBar Control (Feed is ALWAYS Black -> White Text)
    useFocusEffect(
        useCallback(() => {
            RNStatusBar.setBarStyle('light-content', true);
        }, [])
    );
    // Screen Focus Control (Pause videos when navigating away)
    useFocusEffect(
        useCallback(() => {
            setScreenFocused(true);
            setActiveTab('foryou'); // Reset to 'Sana Özel' when returning to feed
            return () => {
                setScreenFocused(false);
            };
        }, [setScreenFocused])
    );

    const hasUnseenStories = true;

    // UI Opacity Animation for "Seek to Hide"
    const uiOpacityStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(isSeeking ? 0 : 1, { duration: 200 })
        };
    }, [isSeeking]);

    const activeIndex = useActiveVideoStore((state) => state.activeIndex);

    // Track if scroll was initiated by the list itself to avoid loops
    const lastInternalIndex = useRef(activeIndex);

    // Effect to scroll to active video when it changes from "outside" (e.g. Explore/Profile)
    useEffect(() => {
        if (videos.length > 0 && activeIndex !== lastInternalIndex.current) {
            console.log(`🎯 External jump detected: Scroll to index ${activeIndex}`);
            listRef.current?.scrollToIndex({
                index: activeIndex,
                animated: false, // Instant jump for better UX when opening from grid
            });
            lastInternalIndex.current = activeIndex;
        }
    }, [activeIndex, videos.length]);

    // Set initial active
    useEffect(() => {
        if (videos.length > 0 && !activeVideoId) {
            setActiveVideo(videos[0].id, 0);
        }
    }, [videos, activeVideoId, setActiveVideo]);

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken<Video>[] }) => {
            if (viewableItems.length > 0) {
                const newIndex = viewableItems[0].index ?? 0;
                const newId = viewableItems[0].item?.id ?? null;

                if (newId !== activeVideoId) {
                    lastInternalIndex.current = newIndex; // Mark as internal
                    setActiveVideo(newId, newIndex);
                    // Video değişince story bar'ı kapat
                    setActiveTab('foryou');
                }
            }
        },
        [activeVideoId, setActiveVideo]
    );

    const viewabilityConfigCallbackPairs = useRef([
        {
            viewabilityConfig: VIEWABILITY_CONFIG,
            onViewableItemsChanged,
        },
    ]);

    const handleToggleMute = useCallback(() => {
        toggleMute();
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [toggleMute]);

    const handleMorePress = useCallback(() => {
        setMoreSheetVisible(true);
    }, []);

    const handleCloseMore = useCallback(() => {
        setMoreSheetVisible(false);
    }, []);

    const handleStoryPress = useCallback(() => {
        // Hikayeler tab'ına geç - bar açılır
        setActiveTab('stories');
    }, []);

    const handleTabChange = useCallback((tab: 'stories' | 'foryou') => {
        setActiveTab(tab);
        // Bar açıldığında videoyu HEMEN duraklat
        const isPaused = useActiveVideoStore.getState().isPaused;
        if (tab === 'stories') {
            if (!isPaused) {
                togglePause();
            }
        } 
        // Kapanma durumunda (foryou) video resume işlemini StoryBar'ın 
        // onClose callback'i içinde animasyondan sonra yapacağız.
    }, [togglePause]);

    const handleCloseStoryBar = useCallback(() => {
        setActiveTab('foryou');
        // Animasyonun bitmesini bekleyip (yaklaşık 250-300ms) videoyu başlatıyoruz
        setTimeout(() => {
            if (useActiveVideoStore.getState().isPaused) {
                togglePause();
            }
        }, 300);
    }, [togglePause]);

    const handleFeedTap = useCallback(() => {
        if (activeTab === 'stories') {
            handleCloseStoryBar();
        } else {
            togglePause();
        }
    }, [activeTab, handleCloseStoryBar, togglePause]);

    const handleStoryAvatarPress = useCallback((userId: string) => {
        // Belirli bir kullanıcının hikayesini aç
        router.push(`/story/${userId}`);
    }, [router]);

    const handleOpenDescription = useCallback(() => {
        setDescriptionSheetVisible(true);
        // User requested video to pause when reading description
        if (!useActiveVideoStore.getState().isPaused) {
            togglePause();
        }
    }, [togglePause]);

    const handleCloseDescription = useCallback(() => {
        setDescriptionSheetVisible(false);
        // User requested video to resume when closed
        if (useActiveVideoStore.getState().isPaused) {
            togglePause();
        }
    }, [togglePause]);

    const handleDeletePress = useCallback(() => {
        if (!activeVideoId) return;
        setDeleteModalVisible(true);
    }, [activeVideoId]);

    const handleSheetDelete = useCallback(() => {
        handleCloseMore();
        handleDeletePress();
    }, [handleCloseMore, handleDeletePress]);

    const handleDoubleTapLike = useCallback(
        (videoId: string) => {
            const video = videos.find((v) => v.id === videoId);
            if (video && !video.isLiked) {
                toggleLike(videoId);
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            }
        },
        [videos, toggleLike]
    );

    const handleSeekReady = useCallback((seekFn: (time: number) => void) => {
        videoSeekRef.current = seekFn;
    }, []);

    // Snap back when on last video and scrolled past
    const handleScrollEnd = useCallback((event: any) => {
        if (videos.length === 0) return;
        const offsetY = event.nativeEvent.contentOffset.y;
        const lastVideoOffset = (videos.length - 1) * ITEM_HEIGHT;
        // If scrolled past last video, snap back
        if (offsetY > lastVideoOffset) {
            listRef.current?.scrollToIndex({ index: videos.length - 1, animated: true });
        }
    }, [videos.length, ITEM_HEIGHT]);

    // FeedItem - Memo bileşeni (Performance için)
    const FeedItem = memo(({ video, isActive }: { video: Video; isActive: boolean }) => {
        const doubleTapRef = useRef<DoubleTapLikeRef>(null);

        const handleLikePress = useCallback(() => {
            // Eğer video henüz beğenilmemişse, animasyonu tetikle
            if (!video.isLiked) {
                // Önce state update (senkron olsun)
                toggleLike(video.id);
                // Hemen ardından animasyonu tetikle (aynı frame'de)
                doubleTapRef.current?.animateLike();
                if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            } else {
                // Unlike - sadece state update, animasyon yok
                toggleLike(video.id);
            }
        }, [video.isLiked, video.id]);

        return (
            <View style={[styles.itemContainer, { height: ITEM_HEIGHT }]}>
                {/* Layer 1: Content & Gestures (Background) */}
                <DoubleTapLike
                    ref={doubleTapRef}
                    onDoubleTap={() => handleDoubleTapLike(video.id)}
                    onSingleTap={handleFeedTap}
                >
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
                        <VideoLayer
                            video={video}
                            isActive={isActive}
                            isMuted={isMuted}
                            isScrolling={isScrollingSV}
                            onSeekReady={isActive ? handleSeekReady : undefined}
                            onRemoveVideo={() => {
                                console.log(`[FeedScreen] Auto-removing dead video: ${video.id}`);
                                deleteVideo(video.id);
                            }}
                        />
                    </View>
                </DoubleTapLike>

                {/* Layer 2: UI Overlays (Foreground) - Animate Opacity */}
                <Animated.View
                    style={[StyleSheet.absoluteFill, { zIndex: 50 }, uiOpacityStyle]}
                    pointerEvents={isSeeking ? 'none' : 'box-none'}
                >
                    <ActionButtons
                        video={video}
                        onLike={handleLikePress}
                        onSave={() => toggleSave(video.id)}
                        onShare={() => toggleShare(video.id)}
                        onShop={() => toggleShop(video.id)}
                        onProfilePress={() => console.log('Profile')}
                    />

                    <MetadataLayer
                        video={video}
                        onAvatarPress={() => console.log('Open Story/Profile')}
                        onFollowPress={() => toggleFollow(video.id)}
                        onReadMorePress={handleOpenDescription}
                        onCommercialTagPress={() => console.log('Open Commercial Info')}
                    />
                </Animated.View>
            </View>
        );
    });

    const renderItem = useCallback(
        ({ item }: { item: Video }) => {
            const isActive = item.id === activeVideoId && isAppActive;
            return <FeedItem video={item} isActive={isActive} />;
        },
        [activeVideoId, isAppActive]
    );

    const keyExtractor = useCallback((item: Video) => item.id, []);

    // Loading State
    if (isLoading && videos.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <FeedSkeleton />
            </View>
        );
    }

    if (error && videos.length === 0) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Text style={styles.retryText} onPress={refreshFeed}>Tekrar Dene</Text>
            </View>
        );
    }

    if (!isLoading && videos.length === 0) {
        return (
            <View style={styles.container}>
                <ScrollView
                    contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={refreshFeed}
                            tintColor="#FFFFFF"
                        />
                    }
                >
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Henüz video yok</Text>
                        <Text style={[styles.emptySubtext, { marginTop: 10 }]}>İlk videoyu sen yükle! 🚀</Text>
                    </View>
                </ScrollView>

                {/* Header Overlay - Accessible even when empty */}
                <Animated.View
                    style={[StyleSheet.absoluteFill, { zIndex: 50 }]}
                    pointerEvents="box-none"
                >
                    <HeaderOverlay
                        isMuted={isMuted}
                        onToggleMute={handleToggleMute}
                        onStoryPress={handleStoryPress}
                        onMorePress={handleMorePress}
                        onUploadPress={() => setUploadModalVisible(true)}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                        showBrightnessButton={false}
                        hasUnseenStories={hasUnseenStories}
                    />
                </Animated.View>

                <UploadModal
                    isVisible={isUploadModalVisible}
                    onClose={() => setUploadModalVisible(false)}
                />

                <SideOptionsSheet
                    visible={isMoreSheetVisible}
                    onClose={handleCloseMore}
                    onDeletePress={handleSheetDelete}
                />
            </View>
        );
    }

    const renderFooter = () => {
        if (!isLoadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#FFF" />
            </View>
        );
    };

    return (
        <SwipeWrapper
            onSwipeLeft={() => router.push('/explore')}
            onSwipeRight={() => setUploadModalVisible(true)}
        >
            <View style={styles.container}>
                {/* @ts-ignore */}
                <FlashList
                    // @ts-ignore
                    ref={listRef}
                    data={videos}
                    renderItem={renderItem}
                    estimatedItemSize={ITEM_HEIGHT}
                    keyExtractor={keyExtractor}
                    pagingEnabled
                    decelerationRate="fast"
                    snapToInterval={ITEM_HEIGHT}
                    snapToAlignment="start"
                    showsVerticalScrollIndicator={false}
                    viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={refreshFeed}
                            tintColor="#FFFFFF"
                            progressViewOffset={insets.top}
                        />
                    }
                    onEndReached={hasMore ? loadMore : null}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={3}
                    windowSize={5}
                    initialNumToRender={1}
                    bounces={false}
                    overScrollMode="never"
                    onScrollBeginDrag={() => {
                        isScrollingSV.value = true;
                        // Scroll başladığında story bar'ı kapat
                        setActiveTab('foryou');
                    }}
                    onScrollEndDrag={() => { isScrollingSV.value = false; }}
                    onMomentumScrollEnd={(e) => {
                        isScrollingSV.value = false;
                        handleScrollEnd(e);
                    }}
                />

                {/* Fixed Header Overlay - stays on screen during scroll - Animate Opacity */}
                <Animated.View
                    style={[StyleSheet.absoluteFill, { zIndex: 50 }, uiOpacityStyle]}
                    pointerEvents={isSeeking ? 'none' : 'box-none'}
                >
                    <HeaderOverlay
                        isMuted={isMuted}
                        onToggleMute={handleToggleMute}
                        onStoryPress={handleStoryPress}
                        onMorePress={handleMorePress}
                        onUploadPress={() => setUploadModalVisible(true)}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                        showBrightnessButton={false}
                        hasUnseenStories={hasUnseenStories}
                    />
                </Animated.View>

                {/* Story Bar - Yukarıdan Slide Down */}
                <StoryBar
                    isVisible={activeTab === 'stories'}
                    storyUsers={MOCK_STORY_USERS}
                    onAvatarPress={handleStoryAvatarPress}
                    onClose={handleCloseStoryBar}
                />

                {/* Touch Interceptor Overlay - Appears only when bar is open */}
                {activeTab === 'stories' && (
                    <Pressable 
                        style={styles.touchInterceptor} 
                        onPress={handleCloseStoryBar}
                    />
                )}

                <UploadModal
                    isVisible={isUploadModalVisible}
                    onClose={() => setUploadModalVisible(false)}
                />

                <SideOptionsSheet
                    visible={isMoreSheetVisible}
                    onClose={handleCloseMore}
                    onDeletePress={handleSheetDelete}
                />

                <DescriptionSheet
                    visible={isDescriptionSheetVisible}
                    onClose={handleCloseDescription}
                    video={videos.find(v => v.id === activeVideoId) || null}
                    onFollowPress={() => activeVideoId && toggleFollow(activeVideoId)}
                />

                {/* Brightness Controller Overlay - Global for the screen */}
                <BrightnessController />

                <DeleteConfirmationModal
                    visible={isDeleteModalVisible}
                    onCancel={() => setDeleteModalVisible(false)}
                    onConfirm={() => {
                        if (activeVideoId) {
                            deleteVideo(activeVideoId);
                        }
                        setDeleteModalVisible(false);
                    }}
                />
            </View>
        </SwipeWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    itemContainer: {
        width: SCREEN_WIDTH,
        position: 'relative',
    },
    actionsContainer: {
        position: 'absolute',
        right: 12,
        bottom: 120,
        zIndex: 30,
    },
    loadingContainer: { flex: 1, backgroundColor: COLORS.videoBackground },
    loadingText: { color: '#FFF', marginTop: 16 },
    errorContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
    errorText: { color: 'red', marginBottom: 16 },
    retryText: { color: '#FFF', textDecorationLine: 'underline' },
    emptyContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#FFF' },
    emptySubtext: { color: '#aaa' },
    footerLoader: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent'
    },
    touchInterceptor: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999, // Just below StoryBar (1000) but above everything else
        backgroundColor: 'transparent',
    },
});
