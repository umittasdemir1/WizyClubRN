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
    Alert, // Added
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

// Optional: Screen orientation (for fullscreen feature)
let ScreenOrientation: any = null;
try {
    ScreenOrientation = require('expo-screen-orientation');
} catch (e) {
    console.log('[index] expo-screen-orientation not available');
}
import { VideoLayer } from '../../src/presentation/components/feed/VideoLayer';
import { ActionButtons } from '../../src/presentation/components/feed/ActionButtons';
import { HeaderOverlay } from '../../src/presentation/components/feed/HeaderOverlay';
import { MetadataLayer } from '../../src/presentation/components/feed/MetadataLayer';
import { DoubleTapLike } from '../../src/presentation/components/feed/DoubleTapLike';
import { BrightnessController } from '../../src/presentation/components/feed/BrightnessController';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import {
    useActiveVideoStore,
    useAppStateSync,
    useMuteControls,
} from '../../src/presentation/store/useActiveVideoStore';
import { Video } from '../../src/domain/entities/Video';
import { useState, useRef, useCallback, useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { FeedSkeleton } from '../../src/presentation/components/feed/FeedSkeleton';
import { UploadModal } from '../../src/presentation/components/feed/UploadModal';
import { useUploadStore } from '../../src/presentation/store/useUploadStore';

const SCREEN_WIDTH = Dimensions.get('window').width;

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
        removeVideo, // Added
    } = useVideoFeed();

    // Global Store
    const setActiveVideo = useActiveVideoStore((state) => state.setActiveVideo);
    const activeVideoId = useActiveVideoStore((state) => state.activeVideoId);
    const isAppActive = useActiveVideoStore((state) => state.isAppActive);
    const isSeeking = useActiveVideoStore((state) => state.isSeeking);
    const togglePause = useActiveVideoStore((state) => state.togglePause);
    // Upload Success -> Auto Scroll to Top
    const uploadStatus = useUploadStore(state => state.status);
    const uploadedVideoId = useUploadStore(state => state.uploadedVideoId);

    useEffect(() => {
        if (uploadStatus === 'success' && videos.length > 0) {
            // 1. Scroll to Top (Instant)
            listRef.current?.scrollToIndex({ index: 0, animated: false });

            // 2. Force Active Video to the New One (if ID matches or just first)
            if (uploadedVideoId && videos[0].id === uploadedVideoId) {
                setActiveVideo(uploadedVideoId, 0);
            } else {
                // Fallback: Just play first
                setActiveVideo(videos[0].id, 0);
            }
        }
    }, [uploadStatus, videos, uploadedVideoId, setActiveVideo]);

    // Mute controls
    const { isMuted, toggleMute } = useMuteControls();

    // Upload State
    const [isUploadModalVisible, setUploadModalVisible] = useState(false);
    // uploadedVideoId already declared above
    const resetUpload = useUploadStore(state => state.reset);

    // Watch for successful upload
    useEffect(() => {
        if (uploadedVideoId) {
            console.log('🎉 Upload completed! Refreshing feed...');
            refreshFeed();
            resetUpload();
        }
    }, [uploadedVideoId]);

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

    const hasUnseenStories = true;
    const [showFullScreen, setShowFullScreen] = useState(false); // NEW: Track if fullscreen button should show
    const [isFullScreen, setIsFullScreen] = useState(false); // NEW: Track fullscreen state

    // UI Opacity Animation for "Seek to Hide"
    const uiOpacityStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(isSeeking ? 0 : 1, { duration: 200 })
        };
    }, [isSeeking]);

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
                    setActiveVideo(newId, newIndex);
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
                                video={item}
                                isActive={isActive}
                                isMuted={isMuted}
                                isScrolling={isScrollingSV}
                                onSeekReady={isActive ? handleSeekReady : undefined}
                                onResizeModeChange={(mode) => {
                                    // Show fullscreen button for landscape videos (contain mode)
                                    setShowFullScreen(mode === 'contain');
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
                            video={item}
                            onLike={() => toggleLike(item.id)}
                            onSave={() => toggleSave(item.id)}
                            onShare={() => toggleShare(item.id)}
                            onShop={() => toggleShop(item.id)}
                            onMore={() => console.log('More Options')}
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
                    onMorePress={() => console.log('Open More Options')}
                    onUploadPress={() => setUploadModalVisible(true)}
                    onDeletePress={() => {
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
                                        try {
                                            // Optimistic Update: Remove locally first?
                                            // For safety, let's wait for server.
                                            // Show simple loading indicator? Or just wait.
                                            // Haptics.
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

                                            // Note: In a real app, use a service/repository. Directly fetching here for MVP speed.
                                            // Using IP from UploadModal for consistency (192.168.0.138)
                                            const response = await fetch(`http://192.168.0.138:3000/videos/${activeVideoId}`, {
                                                method: 'DELETE'
                                            });

                                            if (response.ok) {
                                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                removeVideo(activeVideoId); // Immediate removal
                                            } else {
                                                const errText = await response.text();
                                                console.error("Delete failed:", errText);
                                                Alert.alert("Hata", "Silme başarısız: " + errText);
                                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                                            }
                                        } catch (e: any) {
                                            console.error(e);
                                            Alert.alert("Bağlantı Hatası", e.message || "Sunucuya ulaşılamadı.");
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                                        }
                                    }
                                }
                            ]
                        );
                    }}
                    hasUnseenStories={hasUnseenStories}
                    showFullScreen={showFullScreen}
                    onFullScreenPress={async () => {
                        if (!ScreenOrientation) {
                            console.log('[index] Screen orientation requires native build');
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            return;
                        }

                        try {
                            if (isFullScreen) {
                                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                                setIsFullScreen(false);
                            } else {
                                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                                setIsFullScreen(true);
                            }
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        } catch (error) {
                            console.error('[index] Orientation error:', error);
                        }
                    }}
                />
            </Animated.View>

            <UploadModal
                isVisible={isUploadModalVisible}
                onClose={() => setUploadModalVisible(false)}
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
