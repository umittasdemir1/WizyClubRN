import { FlashList } from '@shopify/flash-list';
import type { ViewToken } from 'react-native';
import {
    Dimensions,
    StyleSheet,
    View,
    ActivityIndicator,
    Text,
    RefreshControl,
    ScrollView,
    Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeaderOverlay } from './HeaderOverlay';
import { FeedItem } from './FeedItem';
import { BrightnessController } from './BrightnessController';
import { SideOptionsSheet } from './SideOptionsSheet';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { DescriptionSheet } from '../sheets/DescriptionSheet';
import { ShoppingSheet } from '../sheets/ShoppingSheet';
import {
    useActiveVideoStore,
    useAppStateSync,
    useMuteControls,
} from '../../store/useActiveVideoStore';
import { Video } from '../../../domain/entities/Video';
import { useState, useRef, useCallback, useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import BottomSheet from '@gorhom/bottom-sheet';
import { useRouter, useFocusEffect } from 'expo-router';
import { FeedSkeleton } from './FeedSkeleton';
import { useUploadStore } from '../../store/useUploadStore';
import { useAuthStore } from '../../store/useAuthStore';
import { SwipeWrapper } from '../shared/SwipeWrapper';
import { StoryBar } from './StoryBar';
import { useStoryViewer } from '../../hooks/useStoryViewer';
import { COLORS } from '../../../core/constants';
import React from 'react';
import { StatusBar as RNStatusBar } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

const VIEWABILITY_CONFIG = {
    itemVisiblePercentThreshold: 60,
    minimumViewTime: 100,
};

interface FeedManagerProps {
    videos: Video[];
    isLoading: boolean;
    isRefreshing: boolean;
    isLoadingMore?: boolean;
    hasMore?: boolean;
    error: string | null;
    refreshFeed: () => void;
    loadMore?: () => void;
    toggleLike: (id: string) => void;
    toggleSave: (id: string) => void;
    toggleFollow: (id: string) => void;
    toggleShare: (id: string) => void;
    toggleShop: (id: string) => void;
    deleteVideo: (id: string) => void;
    prependVideo?: (video: Video) => void;
    showStories?: boolean;
    isCustomFeed?: boolean;
}

export const FeedManager = ({
    videos,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    error,
    refreshFeed,
    loadMore,
    toggleLike,
    toggleSave,
    toggleFollow,
    toggleShare,
    toggleShop,
    deleteVideo,
    prependVideo,
    showStories = true,
    isCustomFeed = false,
}: FeedManagerProps) => {
    const activeVideoStore = useActiveVideoStore();
    const setActiveVideo = activeVideoStore.setActiveVideo;
    const activeVideoId = activeVideoStore.activeVideoId;
    const isAppActive = activeVideoStore.isAppActive;
    const isSeeking = activeVideoStore.isSeeking;
    const togglePause = activeVideoStore.togglePause;
    const setScreenFocused = activeVideoStore.setScreenFocused;
    const activeIndex = activeVideoStore.activeIndex;

    const { stories: storyListData } = useStoryViewer();

    // Group stories by user for StoryBar
    const storyUsers = React.useMemo(() => {
        return storyListData.reduce((acc: any[], story) => {
            const existing = acc.find(u => u.id === story.user.id);
            if (!existing) {
                acc.push({
                    id: story.user.id,
                    username: story.user.username,
                    avatarUrl: story.user.avatarUrl,
                    hasUnseenStory: !story.isViewed
                });
            } else if (!story.isViewed) {
                existing.hasUnseenStory = true;
            }
            return acc;
        }, []);
    }, [storyListData]);

    const uploadStatus = useUploadStore(state => state.status);
    const uploadedVideoId = useUploadStore(state => state.uploadedVideoId);
    const resetUpload = useUploadStore(state => state.reset);

    // Watch for upload success -> Fetch new video and prepend to feed
    useEffect(() => {
        if (uploadedVideoId && uploadStatus === 'success' && prependVideo && !isCustomFeed) {
            // Logic to fetch and prepend - simplified for the component but keeping original intent
            const handleUploadSuccess = async () => {
                const { supabase } = require('../../../core/supabase');
                const { data: videoData } = await supabase
                    .from('videos')
                    .select('*, profiles:user_id(*)')
                    .eq('id', uploadedVideoId)
                    .single();

                if (videoData) {
                    const newVideo: Video = {
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
                        isCommercial: videoData.is_commercial || false,
                        commercialType: videoData.commercial_type || null,
                        brandName: videoData.brand_name || null,
                        brandUrl: videoData.brand_url || null,
                        createdAt: videoData.created_at,
                        mediaUrls: videoData.media_urls,
                        postType: videoData.post_type,
                    };
                    prependVideo(newVideo);
                    setTimeout(() => {
                        listRef.current?.scrollToIndex({ index: 0, animated: false });
                        setActiveVideo(uploadedVideoId, 0);
                    }, 100);
                    resetUpload();
                }
            };
            handleUploadSuccess();
        }
    }, [uploadedVideoId, uploadStatus]);

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

    // App State Sync
    useAppStateSync();

    // Video progress
    const isScrollingSV = useSharedValue(false);
    const videoSeekRef = useRef<((time: number) => void) | null>(null);

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const listRef = useRef<any>(null);

    const ITEM_HEIGHT = Dimensions.get('window').height;

    const videosRef = useRef(videos);
    useEffect(() => {
        videosRef.current = videos;
    }, [videos]);

    // Imperative StatusBar Control
    useFocusEffect(
        useCallback(() => {
            RNStatusBar.setBarStyle('light-content', true);
        }, [])
    );

    const isScreenFocusedRef = useRef(false);

    useFocusEffect(
        useCallback(() => {
            isScreenFocusedRef.current = true;
            setScreenFocused(true);
            setActiveTab('foryou');

            if (videosRef.current.length > 0 && !lastActiveIdRef.current) {
                setActiveVideo(videosRef.current[0].id, 0);
            }

            return () => {
                isScreenFocusedRef.current = false;
                setScreenFocused(false);
            };
        }, [setScreenFocused, setActiveVideo])
    );

    // Fast init
    useEffect(() => {
        if (videos.length > 0 && !activeVideoId) {
            setActiveVideo(videos[0].id, 0);
            lastActiveIdRef.current = videos[0].id;
        }
    }, [videos, activeVideoId, setActiveVideo]);

    const hasUnseenStories = storyUsers.some((u: any) => u.hasUnseenStory);

    const uiOpacityStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(isSeeking ? 0 : 1, { duration: 200 })
        };
    }, [isSeeking]);

    const lastInternalIndex = useRef(activeIndex);

    useEffect(() => {
        if (videos.length > 0 && activeIndex !== lastInternalIndex.current) {
            listRef.current?.scrollToIndex({
                index: activeIndex,
                animated: false,
            });
            lastInternalIndex.current = activeIndex;
        }
    }, [activeIndex, videos.length]);

    const lastActiveIdRef = useRef<string | null>(activeVideoId);
    useEffect(() => {
        lastActiveIdRef.current = activeVideoId;
    }, [activeVideoId]);

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken<Video>[] }) => {
            if (viewableItems.length > 0) {
                const newIndex = viewableItems[0].index ?? 0;
                const newId = viewableItems[0].item?.id ?? null;

                if (newId && newId !== lastActiveIdRef.current) {
                    lastInternalIndex.current = newIndex;
                    lastActiveIdRef.current = newId;
                    setActiveVideo(newId, newIndex);
                    setActiveTab('foryou');
                }
            }
        },
        [setActiveVideo]
    );

    const viewabilityConfigCallbackPairs = useRef([
        {
            viewabilityConfig: VIEWABILITY_CONFIG,
            onViewableItemsChanged,
        },
    ]);

    const handleToggleMute = useCallback(() => {
        toggleMute();
    }, [toggleMute]);

    const handleMorePress = useCallback(() => {
        sideOptionsSheetRef.current?.snapToIndex(0);
    }, []);

    const handleStoryPress = useCallback(() => {
        setActiveTab('stories');
    }, []);

    const handleTabChange = useCallback((tab: 'stories' | 'foryou') => {
        setActiveTab(tab);
        if (tab === 'stories') {
            if (!useActiveVideoStore.getState().isPaused) {
                togglePause();
            }
        }
    }, [togglePause]);

    const handleCloseStoryBar = useCallback(() => {
        setActiveTab('foryou');
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
        router.push(`/story/${userId}`);
    }, [router]);

    const handleOpenDescription = useCallback(() => {
        descriptionSheetRef.current?.snapToIndex(0);
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
            }
        },
        [videos, toggleLike]
    );

    const handleSeekReady = useCallback((seekFn: (time: number) => void) => {
        videoSeekRef.current = seekFn;
    }, []);

    const handleScrollEnd = useCallback((event: any) => {
        if (videos.length === 0) return;
        const offsetY = event.nativeEvent.contentOffset.y;
        const lastVideoOffset = (videos.length - 1) * ITEM_HEIGHT;
        if (offsetY > lastVideoOffset) {
            listRef.current?.scrollToIndex({ index: videos.length - 1, animated: true });
        }
    }, [videos.length, ITEM_HEIGHT]);

    const handleRemoveVideo = useCallback((videoId: string) => {
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
                        showBack={isCustomFeed}
                        onBack={() => router.back()}
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
            onSwipeLeft={() => !isCustomFeed && router.push('/explore')}
            onSwipeRight={() => !isCustomFeed && router.push('/upload')}
            disabled={isCustomFeed}
        >
            <View style={styles.container}>
                <FlashList
                    // @ts-ignore
                    ref={listRef}
                    data={videos}
                    renderItem={renderItem}
                    estimatedItemSize={ITEM_HEIGHT}
                    keyExtractor={keyExtractor}
                    pagingEnabled
                    decelerationRate={0.985}  // Slightly faster than "fast" (0.99) - more responsive snap
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
                    removeClippedSubviews={true}  // Enable clipping for better performance
                    maxToRenderPerBatch={1}
                    windowSize={3}  // Only render 3 items: prev + current + next
                    initialNumToRender={1}  // Only render first video on mount
                    bounces={false}
                    overScrollMode="never"
                    onScrollBeginDrag={() => {
                        isScrollingSV.value = true;
                        setActiveTab('foryou');
                    }}
                    onScrollEndDrag={() => { isScrollingSV.value = false; }}
                    onMomentumScrollEnd={(e) => {
                        isScrollingSV.value = false;
                        handleScrollEnd(e);
                    }}
                />

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
                        showBack={isCustomFeed}
                        onBack={() => router.back()}
                    />
                </Animated.View>

                {showStories && (
                    <StoryBar
                        isVisible={activeTab === 'stories'}
                        storyUsers={storyUsers}
                        onAvatarPress={handleStoryAvatarPress}
                        onClose={handleCloseStoryBar}
                    />
                )}

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
                        if (index === -1 && useActiveVideoStore.getState().isPaused) {
                            togglePause();
                        }
                    }}
                />

                <ShoppingSheet
                    ref={shoppingSheetRef}
                />

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
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: { flex: 1, backgroundColor: COLORS.videoBackground },
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
        zIndex: 999,
        backgroundColor: 'transparent',
    },
});
