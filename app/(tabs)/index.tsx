const { FlashList } = require('@shopify/flash-list');
import type { ViewToken } from 'react-native';
import {
    Dimensions,
    StyleSheet,
    View,
    ActivityIndicator,
    Text,
    RefreshControl,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoLayer } from '../../src/presentation/components/feed/VideoLayer';
import { ActionButtons } from '../../src/presentation/components/feed/ActionButtons';
import { HeaderOverlay } from '../../src/presentation/components/feed/HeaderOverlay';
import { MetadataLayer } from '../../src/presentation/components/feed/MetadataLayer';
import { DoubleTapLike } from '../../src/presentation/components/feed/DoubleTapLike';
import { VideoSeekBar } from '../../src/presentation/components/feed/VideoSeekBar';
import { BrightnessController } from '../../src/presentation/components/feed/BrightnessController';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import {
    useActiveVideoStore,
    useAppStateSync,
    useMuteControls,
} from '../../src/presentation/store/useActiveVideoStore';
import { Video } from '../../src/domain/entities/Video';
import { useState, useRef, useCallback, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

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
        error,
        toggleLike,
        toggleSave,
        toggleFollow,
        toggleShare,
        toggleShop,
        refreshFeed,
    } = useVideoFeed();

    // Global Store
    const setActiveVideo = useActiveVideoStore((state) => state.setActiveVideo);
    const activeVideoId = useActiveVideoStore((state) => state.activeVideoId);
    const isAppActive = useActiveVideoStore((state) => state.isAppActive);
    const togglePause = useActiveVideoStore((state) => state.togglePause);

    // Mute controls
    const { isMuted, toggleMute } = useMuteControls();

    // App State Sync
    useAppStateSync();

    // 🔥 REMOVED useVideoPreloader Hook to prevent "DDoS" effect.
    // FlashList windowSize={3} will handle mounting/unmounting.
    // VideoLayer's `paused` prop will handle buffering.

    // Video progress state
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const videoSeekRef = useRef<((time: number) => void) | null>(null);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const listRef = useRef<any>(null);

    // Calculate video height - full screen for proper paging
    const TAB_BAR_HEIGHT = 60 + insets.bottom;
    const ITEM_HEIGHT = Dimensions.get('window').height;

    const hasUnseenStories = true;

    // Set initial active
    useEffect(() => {
        if (videos.length > 0 && !activeVideoId) {
            setActiveVideo(videos[0].id, 0);
        }
    }, [videos, activeVideoId, setActiveVideo]);

    // Reset progress
    useEffect(() => {
        setCurrentTime(0);
        setDuration(0);
    }, [activeVideoId]);

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken<Video>[] }) => {
            if (viewableItems.length > 0) {
                const newIndex = viewableItems[0].index ?? 0;
                const newId = viewableItems[0].item?.id ?? null;

                if (newId !== activeVideoId) {
                    setActiveVideo(newId, newIndex);
                    // Reset seekbar when video changes
                    setCurrentTime(0);
                    setDuration(0);
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

    const handleProgressUpdate = useCallback((time: number, dur: number) => {
        setCurrentTime(time);
        if (dur > 0) setDuration(dur);
    }, []);

    const handleSeekReady = useCallback((seekFn: (time: number) => void) => {
        videoSeekRef.current = seekFn;
    }, []);

    const handleSeek = useCallback((time: number) => {
        videoSeekRef.current?.(time);
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
                        <View style={StyleSheet.absoluteFill}>
                            <VideoLayer
                                video={item}
                                isActive={isActive}
                                isMuted={isMuted}
                                onProgressUpdate={isActive ? handleProgressUpdate : undefined}
                                onSeekReady={isActive ? handleSeekReady : undefined}
                            />
                            {/* ... Gradients ... */}
                            <LinearGradient
                                colors={[
                                    'rgba(0,0,0,0.15)',
                                    'transparent',
                                    'transparent',
                                    'rgba(0,0,0,0.5)',
                                ]}
                                locations={[0, 0.2, 0.6, 1]}
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />
                        </View>
                    </DoubleTapLike>

                    {/* Layer 2: UI Overlays (Foreground) - No HeaderOverlay here, moved outside */}
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">

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
                            // Pass itemHeight to MetadataLayer if needed to bottom align? 
                            // Actually MetadataLayer is absolute positioned bottom: 20 + padding.
                            // It should be fine relative to the container.
                            onAvatarPress={() => console.log('Open Story/Profile')}
                            onFollowPress={() => toggleFollow(item.id)}
                            onReadMorePress={() => console.log('Open Description')}
                            onCommercialTagPress={() => console.log('Open Commercial Info')}
                        />
                    </View>
                </View>
            );
        },
        [
            activeVideoId,
            isAppActive,
            isMuted,
            handleToggleMute,
            handleDoubleTapLike,
            handleProgressUpdate,
            toggleLike,
            toggleSave,
            router,
            hasUnseenStories,
            ITEM_HEIGHT,
        ]
    );

    const keyExtractor = useCallback((item: Video) => item.id, []);

    // ... Loading/Error/Empty States (omitted for brevity, same as before) ...
    // Note: Re-inserting them for completeness

    // Loading State
    if (isLoading && videos.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Videolar yükleniyor...</Text>
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

    return (
        <View style={styles.container}>
            {/* @ts-ignore */}
            <FlashList
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
                removeClippedSubviews={true}
                maxToRenderPerBatch={1}
                windowSize={3}
                initialNumToRender={1}
                bounces={false}
                overScrollMode="never"
                onMomentumScrollEnd={handleScrollEnd}
            />

            {/* Fixed Header Overlay - stays on screen during scroll */}
            <HeaderOverlay
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
                onStoryPress={() => router.push('/story/1')}
                onMorePress={() => console.log('Open More Options')}
                hasUnseenStories={hasUnseenStories}
            />

            {duration > 0 && (
                <VideoSeekBar
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={handleSeek}
                    isActive={true}
                />
            )}

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
        bottom: 120, // This is overridden by ActionButtons absolute position inside layout logic
        zIndex: 30,
        // Remove ActionButtons layout styles from here if they are inside component
    },
    loadingContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#FFF', marginTop: 16 },
    errorContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    errorText: { color: 'red', marginBottom: 16 },
    retryText: { color: '#FFF', textDecorationLine: 'underline' },
    emptyContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#FFF' },
    emptySubtext: { color: '#aaa' },
});
