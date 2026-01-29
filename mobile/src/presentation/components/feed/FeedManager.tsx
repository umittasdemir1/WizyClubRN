/**
 * FeedManager - Dual Layer Architecture (Orchestrator)
 * 
 * Reduced and modularized version (~300 lines targeted).
 * Concerned only with orchestration and high-level layout.
 */

import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { View, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';

// Store & Domain
import { useActiveVideoStore, useMuteControls } from '../../store/useActiveVideoStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useUploadStore } from '../../store/useUploadStore';
import { useInAppBrowserStore } from '../../store/useInAppBrowserStore';
import { useStoryViewer } from '../../hooks/useStoryViewer';
import { Video } from '../../../domain/entities/Video';

// Modular Hooks & Architecture
import { ITEM_HEIGHT, isDisabled } from './hooks/useFeedConfig';
import { useFeedScroll } from './hooks/useFeedScroll';
import { useFeedInteractions } from './hooks/useFeedInteractions';
import { useFeedActions } from './hooks/useFeedActions';
import { useFeedVideoCallbacks } from './hooks/useFeedVideoCallbacks';
import { useFeedLifecycleSync } from './hooks/useFeedLifecycleSync';

// Components
import { VideoPlayerPool, type VideoPlayerPoolRef } from './VideoPlayerPool';
import { BrightnessOverlay } from './BrightnessOverlay';
import { FeedOverlays, type FeedOverlaysRef } from './FeedOverlays';
import { SwipeWrapper } from '../shared/SwipeWrapper';
import { ScrollPlaceholder } from './ScrollPlaceholder';
import { FeedStatusViews } from './FeedStatusViews';

// Utils & Styles
import { isFeedVideoItem } from './utils/FeedUtils';
import { styles } from './FeedManager.styles';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

// ============================================================================ 
// Types
// ============================================================================ 

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

// ============================================================================ 
// Main Component
// ============================================================================ 

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
    deleteVideo,
    prependVideo,
    showStories = true,
    isCustomFeed = false,
}: FeedManagerProps) => {
    // Hooks & Store
    const insets = useSafeAreaInsets();
    const netInfo = useNetInfo();
    const router = useRouter();
    const { user } = useAuthStore();
    const { stories: storyListData } = useStoryViewer();
    const { isMuted, toggleMute } = useMuteControls();

    // Active Video State (Zustand)
    const activeVideoId = useActiveVideoStore((state) => state.activeVideoId);
    const activeIndex = useActiveVideoStore((state) => state.activeIndex);
    const isSeeking = useActiveVideoStore((state) => state.isSeeking);
    const isPaused = useActiveVideoStore((state) => state.isPaused);
    const isAppActive = useActiveVideoStore((state) => state.isAppActive);
    const ignoreAppState = useActiveVideoStore((state) => state.ignoreAppState);
    const isCleanScreen = useActiveVideoStore((state) => state.isCleanScreen);
    const playbackRate = useActiveVideoStore((state) => state.playbackRate);
    const viewingMode = useActiveVideoStore((state) => state.viewingMode);
    const setActiveVideo = useActiveVideoStore((state) => state.setActiveVideo);
    const togglePause = useActiveVideoStore((state) => state.togglePause);
    const setPaused = useActiveVideoStore((state) => state.setPaused);
    const setScreenFocused = useActiveVideoStore((state) => state.setScreenFocused);
    const setCleanScreen = useActiveVideoStore((state) => state.setCleanScreen);
    const setPlaybackRate = useActiveVideoStore((state) => state.setPlaybackRate);

    // External Store Access
    const isInAppBrowserVisible = useInAppBrowserStore((state) => state.isVisible);
    const openInAppBrowser = useInAppBrowserStore((state) => state.openUrl);
    const uploadStatus = useUploadStore((state) => state.status);
    const uploadedVideoId = useUploadStore((state) => state.uploadedVideoId);
    const { reset: resetUpload } = useUploadStore();

    // Refs
    const videosRef = useRef(videos);
    const lastActiveIdRef = useRef<string | null>(activeVideoId);
    const lastInternalIndex = useRef(activeIndex);
    const videoPlayerRef = useRef<VideoPlayerPoolRef | null>(null);
    const listRef = useRef<any>(null);
    const overlaysRef = useRef<FeedOverlaysRef>(null);
    const descriptionSheetRef = useRef<any>(null);
    const moreOptionsSheetRef = useRef<any>(null);

    // Derived State
    const [rateLabel, setRateLabel] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'stories' | 'foryou'>('foryou');
    const [isCarouselInteracting, setIsCarouselInteracting] = useState(false);

    const activeVideo = useMemo(() => videos.find((v) => v.id === activeVideoId) || null, [videos, activeVideoId]);
    const isOwnActiveVideo = !!activeVideo && activeVideo.user?.id === user?.id;
    const isActivePlayable = useMemo(() => (activeVideo ? isFeedVideoItem(activeVideo) : false), [activeVideo]);

    const storyUsers = useMemo(() => {
        return storyListData.reduce((acc: any[], story) => {
            if (!acc.find((u) => u.id === story.user.id)) {
                acc.push({ ...story.user, hasUnseenStory: !story.isViewed });
            } else if (!story.isViewed) {
                const user = acc.find((u) => u.id === story.user.id);
                if (user) user.hasUnseenStory = true;
            }
            return acc;
        }, []);
    }, [storyListData]);

    const hasUnseenStories = storyUsers.some((u: any) => u.hasUnseenStory);

    // ======================================================================== 
    // Modular Hooks Orchestration
    // ======================================================================== 

    const scrollApi = useFeedScroll({
        videosRef, setActiveVideo, setCleanScreen,
        lastActiveIdRef, lastInternalIndex,
        setActiveTab: (tab) => setActiveTab(tab),
        setIsCarouselInteracting: (val) => setIsCarouselInteracting(val),
    });

    const videoCallbacks = useFeedVideoCallbacks({
        videosRef, activeIndex, activeVideoId, viewingMode, togglePause,
        setCleanScreen, videoPlayerRef, listRef,
    });

    const interactionApi = useFeedInteractions({
        videosRef, toggleLike, togglePause, activeTab, setActiveTab,
        playbackRate, setRateLabel, videoPlayerRef, moreOptionsSheetRef,
        isVideoFinished: videoCallbacks.isVideoFinished,
        setIsVideoFinished: videoCallbacks.setIsVideoFinished,
        setIsCarouselInteracting,
        loopCountRef: videoCallbacks.loopCountRef,
        lastLoopTimeRef: videoCallbacks.lastLoopTimeRef,
    });

    const actionApi = useFeedActions({
        activeVideo, activeVideoId, toggleLike, toggleSave, toggleFollow,
        toggleShare, deleteVideo, togglePause, openInAppBrowser,
        setCleanScreen, isCleanScreen, descriptionSheetRef, moreOptionsSheetRef,
        videoPlayerRef, activeTimeRef: videoCallbacks.activeTimeRef,
        setIsVideoFinished: videoCallbacks.setIsVideoFinished,
        loopCountRef: videoCallbacks.loopCountRef,
        insetTop: insets.top,
    });

    useFeedLifecycleSync({
        videos, videosRef, activeVideoId, activeIndex, isPaused, isAppActive,
        ignoreAppState, isInAppBrowserVisible, netInfo, uploadedVideoId,
        uploadStatus, resetUpload, prependVideo, setActiveVideo, togglePause,
        setPaused, setScreenFocused, setActiveTab, listRef, isCustomFeed,
        lastActiveIdRef, lastInternalIndex,
        resetPlayback: videoCallbacks.resetPlayback,
    });

    // ======================================================================== 
    // Callbacks & Render Helpers
    // ======================================================================== 

    const handleSwipeLeft = useCallback(() => {
        if (isCustomFeed || !activeVideo?.user?.id) return;
        router.push(isOwnActiveVideo ? '/profile' : `/user/${activeVideo.user.id}` as any);
    }, [activeVideo?.user?.id, isOwnActiveVideo, isCustomFeed, router]);

    // Memoize overlay props to prevent unnecessary re-renders
    const saveToastProps = useMemo(() => ({
        message: actionApi.saveToastMessage,
        active: actionApi.saveToastActive,
        opacity: actionApi.saveToastOpacity,
        translateY: actionApi.saveToastTranslateY,
    }), [actionApi.saveToastMessage, actionApi.saveToastActive, actionApi.saveToastOpacity, actionApi.saveToastTranslateY]);

    const deleteModalProps = useMemo(() => ({
        visible: actionApi.isDeleteModalVisible,
        onCancel: actionApi.cancelDelete,
        onConfirm: actionApi.confirmDeleteVideo,
    }), [actionApi.isDeleteModalVisible, actionApi.cancelDelete, actionApi.confirmDeleteVideo]);

    const overlayPlayback = useMemo(() => ({
        isPaused,
        hasError: videoCallbacks.hasVideoError,
        retryCount: videoCallbacks.retryCount,
        rateLabel,
        tapIndicator: interactionApi.tapIndicator,
        isFinished: videoCallbacks.isVideoFinished,
        currentTimeSV: videoCallbacks.currentTimeSV,
        durationSV: videoCallbacks.durationSV,
    }), [isPaused, videoCallbacks.hasVideoError, videoCallbacks.retryCount, rateLabel, interactionApi.tapIndicator, videoCallbacks.isVideoFinished, videoCallbacks.currentTimeSV, videoCallbacks.durationSV]);

    const overlayActions = useMemo(() => ({
        onToggleMute: toggleMute,
        onStoryPress: () => setActiveTab('stories'),
        onUploadPress: () => router.push('/upload'),
        onTabChange: setActiveTab,
        onStoryAvatarPress: (userId: string) => router.push(`/story/${userId}` as any),
        onCloseStoryBar: () => setActiveTab('foryou'),
        onCleanScreen: actionApi.handleCleanScreen,
        onSheetDelete: actionApi.handleSheetDelete,
        onFollowPress: actionApi.handleToggleFollow,
        onDescriptionChange: (index: number) => index > 0 && !isPaused && togglePause(),
        onBack: () => router.back(),
        onLike: actionApi.handleToggleLike,
        onSave: actionApi.handleToggleSave,
        onShare: actionApi.handleToggleShare,
        onShop: actionApi.handleOpenShopping,
        onDescription: actionApi.handleOpenDescription,
        onRestart: interactionApi.handleFeedTap,
        onActionPressIn: interactionApi.handleActionPressIn,
        onActionPressOut: interactionApi.handleActionPressOut,
        playbackController: {
            seekTo: actionApi.seekTo,
            retryActive: actionApi.retryActive
        }
    }), [toggleMute, router, actionApi, interactionApi, isPaused, togglePause]);

    const renderItem = useCallback(({ item }: { item: Video }) => (
        <ScrollPlaceholder
            video={item} isActive={item.id === activeVideoId}
            isCleanScreen={isCleanScreen}
            onDoubleTap={() => interactionApi.handleDoubleTapLike(item.id)}
            onSingleTap={interactionApi.handleFeedTap}
            onLongPress={interactionApi.handleLongPress}
            onPressIn={interactionApi.handlePressIn}
            onPressOut={interactionApi.handlePressOut}
            onCarouselTouchStart={interactionApi.handleCarouselTouchStart}
            onCarouselTouchEnd={interactionApi.handleCarouselTouchEnd}
        />
    ), [activeVideoId, isCleanScreen, interactionApi]);

    const uiOpacityStyle = useAnimatedStyle(() => ({ opacity: 1 }), []);

    // ======================================================================== 
    // Main Render
    // ======================================================================== 

    if (videos.length === 0) {
        return (
            <FeedStatusViews
                isLoading={isLoading} isRefreshing={isRefreshing} error={error}
                videosCount={videos.length} refreshFeed={refreshFeed}
                isCleanScreen={isCleanScreen} isMuted={isMuted} toggleMute={toggleMute}
                setActiveTab={setActiveTab} activeTab={activeTab}
                hasUnseenStories={hasUnseenStories} isCustomFeed={isCustomFeed}
                onUploadPress={() => router.push('/upload')}
                onBack={() => router.back()}
            />
        );
    }

    return (
        <SwipeWrapper
            onSwipeLeft={isDisabled('DISABLE_INTERACTIONS') ? undefined : handleSwipeLeft}
            onSwipeRight={isDisabled('DISABLE_INTERACTIONS') ? undefined : () => !isCustomFeed && router.push('/upload')}
            disabled={isCustomFeed || isDisabled('DISABLE_INTERACTIONS')}
        >
            <View style={styles.container}>
                <VideoPlayerPool
                    ref={videoPlayerRef}
                    videos={videos} activeIndex={activeIndex}
                    isMuted={isMuted} isPaused={isPaused} playbackRate={playbackRate}
                    onPlaybackRateChange={setPlaybackRate}
                    onVideoLoaded={videoCallbacks.handleVideoLoaded}
                    onVideoError={videoCallbacks.handleVideoError}
                    onProgress={videoCallbacks.handleVideoProgress}
                    onVideoEnd={videoCallbacks.handleVideoEnd}
                    onRemoveVideo={videoCallbacks.handleRemoveVideo}
                    scrollY={scrollApi.scrollY}
                />

                <BrightnessOverlay />

                <View style={styles.scrollLayer}>
                    <AnimatedFlashList
                        // @ts-ignore
                        ref={listRef}
                        data={videos}
                        renderItem={renderItem}
                        estimatedItemSize={ITEM_HEIGHT}
                        overrideItemLayout={(layout) => layout.size = ITEM_HEIGHT}
                        keyExtractor={(item: Video) => item.id}
                        updateCellsBatchingPeriod={16}
                        snapToInterval={ITEM_HEIGHT}
                        snapToAlignment="start"
                        decelerationRate="fast"
                        disableIntervalMomentum={true}
                        showsVerticalScrollIndicator={false}
                        viewabilityConfigCallbackPairs={scrollApi.viewabilityConfigCallbackPairs.current}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefreshing} onRefresh={refreshFeed}
                                tintColor="#FFFFFF" progressViewOffset={insets.top}
                            />
                        }
                        onEndReached={hasMore ? loadMore : null}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={isLoadingMore ? <ActivityIndicator style={styles.footerLoader} color="#FFF" /> : null}
                        removeClippedSubviews={false}
                        maxToRenderPerBatch={1}
                        windowSize={3}
                        drawDistance={ITEM_HEIGHT * 1.5}
                        scrollEnabled={!isCarouselInteracting}
                        onScroll={scrollApi.scrollHandler}
                        scrollEventThrottle={16}
                        onMomentumScrollEnd={(e: any) => scrollApi.handleScrollEnd(e, videos.length, listRef)}
                    />
                </View>

                {!isDisabled('DISABLE_OVERLAYS') && (
                    <FeedOverlays
                        ref={overlaysRef as any}
                        moreOptionsSheetRef={moreOptionsSheetRef}
                        descriptionSheetRef={descriptionSheetRef}
                        activeVideo={activeVideo} activeVideoId={activeVideoId}
                        currentUserId={user?.id || null}
                        isOwnActiveVideo={isOwnActiveVideo}
                        isCleanScreen={isCleanScreen} isSeeking={isSeeking}
                        isMuted={isMuted} activeTab={activeTab}
                        hasUnseenStories={hasUnseenStories}
                        showStories={showStories} isCustomFeed={isCustomFeed}
                        storyUsers={storyUsers} uiOpacityStyle={uiOpacityStyle}
                        activeIndex={activeIndex} isPlayable={isActivePlayable}
                        scrollY={scrollApi.scrollY} isScrollingSV={scrollApi.isScrollingSV}
                        saveToast={saveToastProps}
                        deleteModal={deleteModalProps}
                        playback={overlayPlayback}
                        actions={overlayActions}
                    />
                )}
            </View>
        </SwipeWrapper>
    );
};
