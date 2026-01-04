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
import { FeedItem } from '../../src/presentation/components/feed/FeedItem';
import { BrightnessController } from '../../src/presentation/components/feed/BrightnessController';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { SideOptionsSheet } from '../../src/presentation/components/feed/SideOptionsSheet';
import { DeleteConfirmationModal } from '../../src/presentation/components/feed/DeleteConfirmationModal';
import { DescriptionSheet } from '../../src/presentation/components/sheets/DescriptionSheet';
import { ShoppingSheet } from '../../src/presentation/components/sheets/ShoppingSheet';
import {
    useActiveVideoStore,
    useAppStateSync,
    useMuteControls,
} from '../../src/presentation/store/useActiveVideoStore';
import { Video } from '../../src/domain/entities/Video';
import { useState, useRef, useCallback, useEffect, memo } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import BottomSheet from '@gorhom/bottom-sheet';
import { useRouter, useFocusEffect } from 'expo-router';
import { FeedSkeleton } from '../../src/presentation/components/feed/FeedSkeleton';
import { useUploadStore } from '../../src/presentation/store/useUploadStore';
import { useAuthStore } from '../../src/presentation/store/useAuthStore';

import { SwipeWrapper } from '../../src/presentation/components/shared/SwipeWrapper';
import { StoryBar } from '../../src/presentation/components/feed/StoryBar';
import { useStoryViewer } from '../../src/presentation/hooks/useStoryViewer';

import { COLORS } from '../../src/core/constants';

const SCREEN_WIDTH = Dimensions.get('window').width;

// MOCK_STORY_USERS removed - using real data

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
        prependVideo,
    } = useVideoFeed();

    const { stories: storyListData } = useStoryViewer();

    // Group stories by user for StoryBar
    const storyUsers = storyListData.reduce((acc: any[], story) => {
        const existing = acc.find(u => u.id === story.user.id);
        if (!existing) {
            acc.push({
                id: story.user.id,
                username: story.user.username,
                avatarUrl: story.user.avatarUrl,
                hasUnseenStory: !story.isViewed
            });
        } else {
            // If ANY story is unseen, mark hasUnseenStory as true
            if (!story.isViewed) {
                existing.hasUnseenStory = true;
            }
        }
        return acc;
    }, []);

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

    // 1. Watch for upload success -> Fetch new video and prepend to feed
    useEffect(() => {
        const handleUploadSuccess = async () => {
            if (uploadedVideoId && uploadStatus === 'success') {
                console.log('🎉 Upload success detected, fetching video:', uploadedVideoId);

                try {
                    // Fetch the newly uploaded video from Supabase
                    const { supabase } = require('../../src/core/supabase');
                    const { data: videoData, error } = await supabase
                        .from('videos')
                        .select(`
                            *,
                            profiles:user_id (
                                id,
                                username,
                                full_name,
                                avatar_url
                            )
                        `)
                        .eq('id', uploadedVideoId)
                        .single();

                    if (error || !videoData) {
                        console.error('[Upload] Failed to fetch new video:', error);
                        refreshFeed(); // Fallback to refresh
                        return;
                    }

                    // Map to Video entity
                    const newVideo = {
                        id: videoData.id,
                        videoUrl: videoData.video_url,
                        thumbnailUrl: videoData.thumbnail_url,
                        description: videoData.description || '',
                        user: {
                            id: videoData.profiles?.id || videoData.user_id,
                            username: videoData.profiles?.username || 'unknown',
                            fullName: videoData.profiles?.full_name || '',
                            avatarUrl: videoData.profiles?.avatar_url || '',
                            isFollowing: false,
                        },
                        likesCount: 0,
                        savesCount: 0,
                        sharesCount: 0,
                        shopsCount: 0,
                        commentsCount: 0,
                        isLiked: false,
                        isSaved: false,
                        isFollowing: false,
                        isCommercial: videoData.is_commercial || false,
                        commercialType: videoData.commercial_type || null,
                        brandName: videoData.brand_name || null,
                        brandUrl: videoData.brand_url || null,
                        createdAt: videoData.created_at,
                    };

                    // Prepend to feed
                    prependVideo(newVideo);
                    console.log('✅ [Upload] Video prepended to feed');

                    // Scroll to top and activate
                    setTimeout(() => {
                        listRef.current?.scrollToIndex({ index: 0, animated: false });
                        setActiveVideo(uploadedVideoId, 0);
                        console.log('✅ [Upload] Video activated for playback');
                    }, 100);

                    // Reset upload state
                    resetUpload();

                } catch (err) {
                    console.error('[Upload] Error handling success:', err);
                    refreshFeed();
                }
            }
        };

        handleUploadSuccess();
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
            const targetId = isMatch ? uploadedVideoId! : videos[0].id;

            // 🔥 IMMEDIATE: Set active video first
            setActiveVideo(targetId, 0);

            // 🔥 DELAYED: Scroll after list updates (ensure FlashList has rendered)
            setTimeout(() => {
                listRef.current?.scrollToIndex({ index: 0, animated: false });
                // Double-set to ensure it sticks
                setActiveVideo(targetId, 0);
            }, 100);

            // Cleanup
            isUploadRefreshRef.current = false;
            resetUpload();
        }
    }, [isRefreshing, videos, uploadedVideoId, setActiveVideo, resetUpload]);

    // Mute controls
    const { isMuted, toggleMute } = useMuteControls();

    // Tab State
    const [activeTab, setActiveTab] = useState<'stories' | 'foryou'>('foryou');

    // Delete modal state
    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);

    // Sheet refs
    const sideOptionsSheetRef = useRef<BottomSheet>(null);
    const descriptionSheetRef = useRef<BottomSheet>(null);
    const shoppingSheetRef = useRef<BottomSheet>(null);
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

    // Ref to hold latest videos array
    const videosRef = useRef(videos);
    useEffect(() => {
        videosRef.current = videos;
    }, [videos]);

    // Imperative StatusBar Control (Feed is ALWAYS Black -> White Text)
    useFocusEffect(
        useCallback(() => {
            RNStatusBar.setBarStyle('light-content', true);
        }, [])
    );

    const isScreenFocusedRef = useRef(false);

    // Screen Focus Control (Pause videos when navigating away)
    useFocusEffect(
        useCallback(() => {
            isScreenFocusedRef.current = true;
            setScreenFocused(true);
            setActiveTab('foryou'); // Reset to 'Sana Özel' when returning to feed

            // Set initial active video when tab is focused
            if (videosRef.current.length > 0 && !lastActiveIdRef.current) {
                console.log('[FeedScreen] Tab focused - Starting first video');
                setActiveVideo(videosRef.current[0].id, 0);
            }

            return () => {
                isScreenFocusedRef.current = false;
                setScreenFocused(false);
            };
        }, [setScreenFocused, setActiveVideo])
    );

    // Watch for late arrival of videos - AGGRESSIVE INIT for instant playback
    useEffect(() => {
        // If we have videos but no active video, set the first one immediately.
        // We don't wait for focus check because FeedScreen is the entry point.
        if (videos.length > 0 && !activeVideoId) {
             console.log('[FeedScreen] 🚀 Fast init: Starting first video immediately');
             setActiveVideo(videos[0].id, 0);
        }
    }, [videos, activeVideoId, setActiveVideo]);


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

    // 🔥 CRITICAL: Ref to track active video ID OUTSIDE render cycle
    const lastActiveIdRef = useRef<string | null>(activeVideoId);

    // Keep ref in sync with state (one-way: state -> ref)
    useEffect(() => {
        lastActiveIdRef.current = activeVideoId;
    }, [activeVideoId]);

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken<Video>[] }) => {
            if (viewableItems.length > 0) {
                const newIndex = viewableItems[0].index ?? 0;
                const newId = viewableItems[0].item?.id ?? null;

                // 🔥 Compare against REF, not state - breaks the loop!
                if (newId && newId !== lastActiveIdRef.current) {
                    console.log(`[Viewability] 👁️ Active video: ${newId} (index ${newIndex})`);
                    lastInternalIndex.current = newIndex;
                    lastActiveIdRef.current = newId; // Update ref immediately
                    setActiveVideo(newId, newIndex);
                    setActiveTab('foryou');
                }
            }
        },
        [setActiveVideo] // 🔥 NO activeVideoId here!
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
        sideOptionsSheetRef.current?.snapToIndex(0);
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
        descriptionSheetRef.current?.snapToIndex(0);
        // User requested video to pause when reading description
        if (!useActiveVideoStore.getState().isPaused) {
            togglePause();
        }
    }, [togglePause]);

    const handleOpenShopping = useCallback(() => {
        shoppingSheetRef.current?.snapToIndex(0);
    }, []);

    const handleDeletePress = useCallback(() => {
        if (!activeVideoId) return;
        setDeleteModalVisible(true);
    }, [activeVideoId]);

    const handleSheetDelete = useCallback(() => {
        sideOptionsSheetRef.current?.close();
        handleDeletePress();
    }, [handleDeletePress]);

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

    // Stable callback handlers for FeedItem (prevents re-render on activeVideoId change)
    const handleRemoveVideo = useCallback((videoId: string) => {
        console.log(`[FeedScreen] Auto-removing dead video: ${videoId}`);
        deleteVideo(videoId);
    }, [deleteVideo]);

    const { user } = useAuthStore();
    const currentUserId = user?.id;

    const renderItem = useCallback(
        ({ item }: { item: Video }) => {
            const isActive = item.id === activeVideoId && isAppActive;
            return (
                <FeedItem
                    video={item}
                    isActive={isActive}
                    isMuted={isMuted}
                    isScrolling={isScrollingSV}
                    isSeeking={isSeeking}
                    uiOpacityStyle={uiOpacityStyle}
                    currentUserId={currentUserId}
                    onDoubleTapLike={handleDoubleTapLike}
                    onFeedTap={handleFeedTap}
                    onSeekReady={isActive ? handleSeekReady : undefined}
                    onRemoveVideo={handleRemoveVideo}
                    onToggleLike={toggleLike}
                    onToggleSave={toggleSave}
                    onToggleShare={toggleShare}
                    onToggleFollow={toggleFollow}
                    onOpenShopping={handleOpenShopping}
                    onOpenDescription={handleOpenDescription}
                />
            );
        },
        [activeVideoId, isAppActive, isMuted, isSeeking, currentUserId]
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
                        onUploadPress={() => router.push('/upload')}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                        showBrightnessButton={false}
                        hasUnseenStories={hasUnseenStories}
                    />
                </Animated.View>

                <SideOptionsSheet
                    ref={sideOptionsSheetRef}
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
            onSwipeRight={() => router.push('/upload')}
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
                    removeClippedSubviews={false} // 🔥 CRITICAL: Keep videos mounted to prevent re-decode delay
                    maxToRenderPerBatch={3}
                    windowSize={7} // Increased buffer for smoother scroll
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
                        onUploadPress={() => router.push('/upload')}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                        showBrightnessButton={false}
                        hasUnseenStories={hasUnseenStories}
                    />
                </Animated.View>

                {/* Story Bar - Yukarıdan Slide Down */}
                <StoryBar
                    isVisible={activeTab === 'stories'}
                    storyUsers={storyUsers}
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

                <SideOptionsSheet
                    ref={sideOptionsSheetRef}
                    onDeletePress={handleSheetDelete}
                />

                <DescriptionSheet
                    ref={descriptionSheetRef}
                    video={videos.find(v => v.id === activeVideoId) || null}
                    onFollowPress={() => activeVideoId && toggleFollow(activeVideoId)}
                    onChange={(index) => {
                        // When sheet is closed (index === -1), resume video
                        if (index === -1 && useActiveVideoStore.getState().isPaused) {
                            togglePause();
                        }
                    }}
                />

                <ShoppingSheet
                    ref={shoppingSheetRef}
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
