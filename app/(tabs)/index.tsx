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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { VideoLayer } from '../../src/presentation/components/feed/VideoLayer';
import { ActionButtons } from '../../src/presentation/components/feed/ActionButtons';
import { HeaderOverlay } from '../../src/presentation/components/feed/HeaderOverlay';
import { MetadataLayer } from '../../src/presentation/components/feed/MetadataLayer';
import { DoubleTapLike } from '../../src/presentation/components/feed/DoubleTapLike';
import { BrightnessController } from '../../src/presentation/components/feed/BrightnessController';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { SideOptionsSheet } from '../../src/presentation/components/feed/SideOptionsSheet';
import {
    useActiveVideoStore,
    useAppStateSync,
    useMuteControls,
} from '../../src/presentation/store/useActiveVideoStore';
import { VideoCacheService } from '../../src/data/services/VideoCacheService';
import { Video } from '../../src/domain/entities/Video';
import { useState, useRef, useCallback, useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useRouter, useFocusEffect } from 'expo-router';
import { FeedSkeleton } from '../../src/presentation/components/feed/FeedSkeleton';
import { UploadModal } from '../../src/presentation/components/feed/UploadModal';
import { useUploadStore } from '../../src/presentation/store/useUploadStore';
import { PerformanceLogger } from '../../src/core/services/PerformanceLogger';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';

const SCREEN_WIDTH = Dimensions.get('window').width;

const VIEWABILITY_CONFIG = {
    itemVisiblePercentThreshold: 70, // Increased from 60 to 70 for more stable detection
    minimumViewTime: 150, // Increased from 100 to 150ms to filter fast scrolls
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

    // Theme
    const isDark = useThemeStore((state) => state.isDark);

    // Global Store
    const setActiveVideo = useActiveVideoStore((state) => state.setActiveVideo);
    const activeVideoId = useActiveVideoStore((state) => state.activeVideoId);
    const isAppActive = useActiveVideoStore((state) => state.isAppActive);

    // Upload Success -> Auto Scroll to Top
    const uploadStatus = useUploadStore(state => state.status);
    const uploadedVideoId = useUploadStore(state => state.uploadedVideoId);

    // Upload Recovery State
    const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);

    // 1. Detect Upload Success -> Trigger Refresh & Set Pending State
    useEffect(() => {
        if (uploadStatus === 'success' && uploadedVideoId) {
            console.log('🎉 Upload success detected, refreshing feed...');
            setPendingUploadId(uploadedVideoId);
            refreshFeed();
        }
    }, [uploadStatus, uploadedVideoId]);

    // 2. Watch Videos Update -> If Pending Upload Exists, Switch to it
    useEffect(() => {
        if (pendingUploadId && videos.length > 0) {
            const uploadedVideoIndex = videos.findIndex(v => v.id === pendingUploadId);

            if (uploadedVideoIndex !== -1) {
                console.log(`✅ Uploaded video found at index ${uploadedVideoIndex}, switching active...`);

                // Force switch
                setActiveVideo(pendingUploadId, uploadedVideoIndex);
                listRef.current?.scrollToIndex({ index: uploadedVideoIndex, animated: false });

                // Cleanup
                setPendingUploadId(null);
                setTimeout(() => resetUpload(), 1000); // Delayed reset to prevent state thrashing
            } else {
                console.log('⏳ Uploaded video not yet in feed, waiting...');
            }
        }
    }, [videos, pendingUploadId, setActiveVideo]);

    // Mute controls
    const toggleMute = useActiveVideoStore((state) => state.toggleMute);
    const isMuted = useActiveVideoStore((state) => state.isMuted);
    const isSeeking = useActiveVideoStore((state) => state.isSeeking);
    const togglePause = useActiveVideoStore((state) => state.togglePause);

    // Upload State
    const [isUploadModalVisible, setUploadModalVisible] = useState(false);
    const [isMoreSheetVisible, setMoreSheetVisible] = useState(false);
    const resetUpload = useUploadStore(state => state.reset);

    // App State Sync
    useAppStateSync();

    const setScreenFocused = useActiveVideoStore((state) => state.setScreenFocused);

    useFocusEffect(
        useCallback(() => {
            console.log('[FeedScreen] 🟢 Screen FOCUSED');
            setScreenFocused(true);

            return () => {
                console.log('[FeedScreen] 🔴 Screen BLURRED');
                setScreenFocused(false);
            };
        }, [setScreenFocused])
    );

    // Video progress
    const isScrollingSV = useSharedValue(false);
    const videoSeekRef = useRef<((time: number) => void) | null>(null);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const listRef = useRef<any>(null);

    const ITEM_HEIGHT = Dimensions.get('window').height;
    const hasUnseenStories = true;

    // UI Opacity
    const uiOpacityStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(isSeeking ? 0 : 1, { duration: 200 })
        };
    }, [isSeeking]);

    // Initial Active Video Recovery
    useEffect(() => {
        if (videos.length > 0) {
            if (!activeVideoId) {
                setActiveVideo(videos[0].id, 0);
            } else {
                const isActiveInList = videos.find(v => v.id === activeVideoId);
                if (!isActiveInList) {
                    // console.log('Active video deleted, switching to first available');
                    setActiveVideo(videos[0].id, 0);
                }
            }
        }
    }, [videos, activeVideoId, setActiveVideo]);

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken<Video>[] }) => {
            if (viewableItems.length > 0) {
                const viewableItem = viewableItems[0];
                const newIndex = viewableItem.index ?? 0;
                const newId = viewableItem.item?.id ?? null;

                if (newId !== activeVideoId) {
                    PerformanceLogger.startTransition(newId);
                    setActiveVideo(newId, newIndex);

                    // SMART PRELOAD (N+1 Strategy)
                    const nextIndex = newIndex + 1;
                    if (nextIndex < videos.length) {
                        const nextVideo = videos[nextIndex];
                        console.log(`🚀 [Preload] Starting pre-fetch for: ${nextVideo.id}`);
                        VideoCacheService.cacheVideo(nextVideo.videoUrl); // Fire and forget
                    }
                }
            }
        },
        [activeVideoId, setActiveVideo, videos]
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

    const handleDeletePress = useCallback(() => {
        if (!activeVideoId) return;
        Alert.alert(
            "İçerik Silinecek",
            "Bu videoyu ve tüm verilerini (R2, Veritabanı) kalıcı olarak silmek istediğinize emin misiniz?",
            [
                { text: "Vazgeç", style: "cancel" },
                {
                    text: "Evet, Sil",
                    style: "destructive",
                    onPress: async () => {
                        // 1. Optimistic Update (Instant Removal)
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        deleteVideo(activeVideoId);

                        try {
                            // 2. Background Server Call
                            // Use Constants for API URL if available, otherwise fallback to local but make it cleaner
                            // Ideally this should come from process.env or Constants.expoConfig.extra
                            const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

                            // The user said "192.168.0.138", let's assume that's their machine.
                            const SERVER_URL = 'http://192.168.0.138:3000';

                            const response = await fetch(`${SERVER_URL}/videos/${activeVideoId}`, {
                                method: 'DELETE'
                            });

                            if (!response.ok) {
                                // Silent failure on UI (video already gone), but log it
                                const errText = await response.text();
                                console.error("Background delete failed:", errText);
                            }
                        } catch (e: any) {
                            console.error("Background delete network error:", e);
                        }
                    }
                }
            ]
        );
    }, [activeVideoId, deleteVideo]);

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

    const renderItem = useCallback(
        ({ item }: { item: Video }) => {
            const isActive = item.id === activeVideoId && isAppActive;

            return (
                <View style={[styles.itemContainer, { height: ITEM_HEIGHT }]}>
                    {/* Layer 1: Content & Gestures (Background) */}
                    <DoubleTapLike
                        onDoubleTap={() => handleDoubleTapLike(item.id)}
                        onSingleTap={togglePause}
                    >
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
                            <VideoLayer
                                key={item.id} // FIX: Force Remount on change to prevent stale state (Thumbnail glitch)
                                video={item}
                                isActive={isActive}
                                isMuted={isMuted}
                                isScrolling={isScrollingSV}
                                onSeekReady={isActive ? handleSeekReady : undefined}
                            />
                        </View>
                    </DoubleTapLike>

                    {/* Layer 2: UI Overlays (Foreground) - Animate Opacity */}
                    <Animated.View
                        style={[StyleSheet.absoluteFill, { zIndex: 50 }, uiOpacityStyle]}
                        pointerEvents={isSeeking ? 'none' : 'box-none'}
                    >
                        <ActionButtons
                            video={item}
                            onLike={() => toggleLike(item.id)}
                            onSave={() => toggleSave(item.id)}
                            onShare={() => toggleShare(item.id)}
                            onShop={() => toggleShop(item.id)}
                            onProfilePress={() => console.log('Profile')}
                        />

                        <MetadataLayer
                            video={item}
                            onAvatarPress={() => console.log('Open Story/Profile')}
                            onFollowPress={() => toggleFollow(item.id)}
                            onReadMorePress={() => console.log('Open Description')}
                            onCommercialTagPress={() => console.log('Open Commercial Info')}
                        />
                    </Animated.View>
                </View>
            );
        },
        [
            activeVideoId,
            isAppActive,
            isMuted,
            handleToggleMute,
            handleDoubleTapLike,
            toggleLike,
            toggleSave,
            router,
            ITEM_HEIGHT,
            isSeeking
        ]
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
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Henüz video yok</Text>
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
        <View style={styles.container}>
            {/* Theme-aware status bar */}
            <StatusBar
                style={isDark ? 'light' : 'dark'}
                backgroundColor={isDark ? '#000000' : '#FFFFFF'}
                translucent={false}
            />

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
                onScrollBeginDrag={() => { isScrollingSV.value = true; }}
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
                    onStoryPress={() => router.push('/story/1')}
                    onMorePress={handleMorePress}
                    onUploadPress={() => setUploadModalVisible(true)}
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

            {/* Brightness Controller Overlay - Global for the screen */}
            <BrightnessController />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    itemContainer: {
        width: SCREEN_WIDTH,
        position: 'relative',
        justifyContent: 'center', // Center video for equal black bars
    },
    actionsContainer: {
        position: 'absolute',
        right: 12,
        bottom: 120,
        zIndex: 30,
    },
    loadingContainer: { flex: 1, backgroundColor: '#000' },
    loadingText: { color: '#FFF', marginTop: 16 },
    errorContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    errorText: { color: 'red', marginBottom: 16 },
    retryText: { color: '#FFF', textDecorationLine: 'underline' },
    emptyContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#FFF' },
    emptySubtext: { color: '#aaa' },
    footerLoader: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent'
    }
});
