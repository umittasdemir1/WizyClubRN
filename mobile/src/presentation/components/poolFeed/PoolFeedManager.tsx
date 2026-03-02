/**
 * PoolFeedManager - Dual Layer Architecture (Orchestrator)
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
import {
    usePoolFeedActiveVideoStore,
    usePoolFeedMuteControls,
    usePoolFeedAuthStore,
} from './hooks/usePoolFeedStores';
import { useUploadStore } from '../../store/useUploadStore';
import { useInAppBrowserStore } from '../../store/useInAppBrowserStore';
import { useSubtitlePreferencesStore, type SubtitlePreferenceMode } from '../../store/useSubtitlePreferencesStore';
import { useStories } from '../../hooks/useStories';
import { useVideoViewTracking } from '../../hooks/useVideoViewTracking';
import { CONFIG } from '../../../core/config';
import type { PoolFeedVideo } from './PoolFeedTypes';

// Modular Hooks & Architecture
import { FEED_CONFIG, ITEM_HEIGHT, isDisabled } from './hooks/usePoolFeedConfig';
import { usePoolFeedScroll } from './hooks/usePoolFeedScroll';
import { usePoolFeedInteractions } from './hooks/usePoolFeedInteractions';
import { usePoolFeedActions } from './hooks/usePoolFeedActions';
import { usePoolFeedVideoCallbacks } from './hooks/usePoolFeedVideoCallbacks';
import { usePoolFeedLifecycleSync } from './hooks/usePoolFeedLifecycleSync';

// Components
import { PoolFeedVideoPlayerPool, type PoolFeedVideoPlayerPoolRef } from './PoolFeedVideoPlayerPool';
import { PoolFeedBrightnessOverlay } from './PoolFeedBrightnessOverlay';
import { PoolFeedOverlays, type PoolFeedOverlaysRef } from './PoolFeedOverlays';
import { SwipeWrapper } from '../shared/SwipeWrapper';
import { PoolFeedScrollPlaceholder } from './PoolFeedScrollPlaceholder';
import { PoolFeedStatusViews } from './PoolFeedStatusViews';

// Utils & Styles
import { isFeedVideoItem } from './utils/PoolFeedUtils';
import { styles } from './PoolFeedManager.styles';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);
const SUBTITLE_AVAILABILITY_CACHE_TTL_MS = 5 * 60 * 1000;
const SUBTITLE_AVAILABILITY_PENDING_RETRY_MS = 3000;

// ============================================================================ 
// Types
// ============================================================================ 

interface PoolFeedManagerProps {
    videos: PoolFeedVideo[];
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
    prependVideo?: (video: PoolFeedVideo) => void;
    showStories?: boolean;
    homeReselectTrigger?: number;
}

// ============================================================================ 
// Main Component
// ============================================================================ 

export const PoolFeedManager = ({
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
    homeReselectTrigger = 0,
}: PoolFeedManagerProps) => {
    // Hooks & Store
    const insets = useSafeAreaInsets();
    const netInfo = useNetInfo();
    const router = useRouter();
    const { user } = usePoolFeedAuthStore();
    const { stories: storyListData } = useStories(undefined, 'pool');
    const { isMuted } = usePoolFeedMuteControls();

    // Active Video State (Zustand)
    const activeVideoId = usePoolFeedActiveVideoStore((state) => state.activeVideoId);
    const activeIndex = usePoolFeedActiveVideoStore((state) => state.activeIndex);
    const isSeeking = usePoolFeedActiveVideoStore((state) => state.isSeeking);
    const isPaused = usePoolFeedActiveVideoStore((state) => state.isPaused);
    const isAppActive = usePoolFeedActiveVideoStore((state) => state.isAppActive);
    const isScreenFocused = usePoolFeedActiveVideoStore((state) => state.isScreenFocused);
    const ignoreAppState = usePoolFeedActiveVideoStore((state) => state.ignoreAppState);
    const isCleanScreen = usePoolFeedActiveVideoStore((state) => state.isCleanScreen);
    const playbackRate = usePoolFeedActiveVideoStore((state) => state.playbackRate);
    const viewingMode = usePoolFeedActiveVideoStore((state) => state.viewingMode);
    const pendingOpenVideo = usePoolFeedActiveVideoStore((state) => state.pendingOpenVideo);
    const setActiveVideo = usePoolFeedActiveVideoStore((state) => state.setActiveVideo);
    const clearPendingOpenVideo = usePoolFeedActiveVideoStore((state) => state.clearPendingOpenVideo);
    const togglePause = usePoolFeedActiveVideoStore((state) => state.togglePause);
    const setPaused = usePoolFeedActiveVideoStore((state) => state.setPaused);
    const setScreenFocused = usePoolFeedActiveVideoStore((state) => state.setScreenFocused);
    const setCleanScreen = usePoolFeedActiveVideoStore((state) => state.setCleanScreen);
    const setPlaybackRate = usePoolFeedActiveVideoStore((state) => state.setPlaybackRate);

    // External Store Access
    const isInAppBrowserVisible = useInAppBrowserStore((state) => state.isVisible);
    const openInAppBrowser = useInAppBrowserStore((state) => state.openUrl);
    const uploadStatus = useUploadStore((state) => state.status);
    const uploadedVideoId = useUploadStore((state) => state.uploadedVideoId);
    const uploadedVideoPayload = useUploadStore((state) => state.uploadedVideoPayload);
    const tryConsumeUploadSuccess = useUploadStore((state) => state.tryConsumeUploadSuccess);
    const { reset: resetUpload } = useUploadStore();

    // Refs
    const videosRef = useRef(videos);
    const lastActiveIdRef = useRef<string | null>(activeVideoId);
    const lastInternalIndex = useRef(activeIndex);
    const videoPlayerRef = useRef<PoolFeedVideoPlayerPoolRef | null>(null);
    const listRef = useRef<any>(null);
    const overlaysRef = useRef<PoolFeedOverlaysRef>(null);
    const descriptionSheetRef = useRef<any>(null);
    const moreOptionsSheetRef = useRef<any>(null);
    const lastHandledReselectRef = useRef(0);

    // Derived State
    const [rateLabel, setRateLabel] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'stories' | 'foryou'>('foryou');
    const [isCarouselInteracting, setIsCarouselInteracting] = useState(false);
    const [subtitleAvailabilityByVideoId, setSubtitleAvailabilityByVideoId] = useState<
        Record<string, { hasSubtitles: boolean; fetchedAt: number; isProcessing?: boolean }>
    >({});
    const subtitleAvailabilityRef = useRef(subtitleAvailabilityByVideoId);
    const subtitlePreferenceMode = useSubtitlePreferencesStore((state) => state.mode);
    const setSubtitlePreferenceMode = useSubtitlePreferencesStore((state) => state.setMode);

    const activeVideo = useMemo(() => videos.find((v) => v.id === activeVideoId) || null, [videos, activeVideoId]);
    const isOwnActiveVideo = !!activeVideo && activeVideo.user?.id === user?.id;
    const isActivePlayable = useMemo(() => (activeVideo ? isFeedVideoItem(activeVideo) : false), [activeVideo]);

    useEffect(() => {
        subtitleAvailabilityRef.current = subtitleAvailabilityByVideoId;
    }, [subtitleAvailabilityByVideoId]);

    useEffect(() => {
        if (!activeVideo?.id) return;
        const videoId = activeVideo.id;
        const cached = subtitleAvailabilityRef.current[videoId];
        const now = Date.now();

        if (activeVideo.postType !== 'video') {
            // Prevent render loops: non-video items should be marked once.
            if (cached?.hasSubtitles === false) return;
            setSubtitleAvailabilityByVideoId((prev) => ({
                ...prev,
                [videoId]: { hasSubtitles: false, fetchedAt: now, isProcessing: false },
            }));
            return;
        }

        const ttlMs = cached?.isProcessing ? SUBTITLE_AVAILABILITY_PENDING_RETRY_MS : SUBTITLE_AVAILABILITY_CACHE_TTL_MS;
        if (cached && (now - cached.fetchedAt) < ttlMs) {
            return;
        }

        void (async () => {
            try {
                const response = await fetch(`${CONFIG.API_URL}/videos/${videoId}/subtitles`);
                if (!response.ok) {
                    setSubtitleAvailabilityByVideoId((prev) => {
                        const prevEntry = prev[videoId];
                        if (prevEntry?.hasSubtitles === false) return prev;
                        return {
                            ...prev,
                            [videoId]: { hasSubtitles: false, fetchedAt: Date.now(), isProcessing: false },
                        };
                    });
                    return;
                }

                const payload = await response.json();
                const rows = Array.isArray(payload?.data) ? payload.data : [];
                const hasPendingSubtitles = rows.some((row: any) => {
                    const status = String(row?.status || '').toLowerCase();
                    return status === 'processing' || status === 'queued' || status === 'pending';
                });
                const hasCompletedSubtitles = rows.some((row: any) => {
                    if (row?.status !== 'completed') return false;
                    const parsedSegments = typeof row?.segments === 'string'
                        ? (() => {
                            try {
                                return JSON.parse(row.segments);
                            } catch {
                                return [];
                            }
                        })()
                        : row?.segments;
                    const segments = Array.isArray(parsedSegments)
                        ? parsedSegments
                        : (Array.isArray(parsedSegments?.segments) ? parsedSegments.segments : []);
                    return segments.length > 0;
                });

                setSubtitleAvailabilityByVideoId((prev) => {
                    const prevEntry = prev[videoId];
                    const nextProcessing = hasPendingSubtitles && !hasCompletedSubtitles;
                    if (
                        prevEntry?.hasSubtitles === hasCompletedSubtitles &&
                        Boolean(prevEntry?.isProcessing) === nextProcessing
                    ) {
                        return prev;
                    }
                    return {
                        ...prev,
                        [videoId]: {
                            hasSubtitles: hasCompletedSubtitles,
                            fetchedAt: Date.now(),
                            isProcessing: nextProcessing,
                        },
                    };
                });
            } catch {
                setSubtitleAvailabilityByVideoId((prev) => {
                    const prevEntry = prev[videoId];
                    if (prevEntry?.hasSubtitles === false) return prev;
                    return {
                        ...prev,
                        [videoId]: { hasSubtitles: false, fetchedAt: Date.now(), isProcessing: false },
                    };
                });
            }
        })();
    }, [activeVideo?.id, activeVideo?.postType]);

    const showSubtitleOption = useMemo(() => {
        if (!activeVideo?.id) return false;
        return Boolean(subtitleAvailabilityByVideoId[activeVideo.id]?.hasSubtitles);
    }, [activeVideo?.id, subtitleAvailabilityByVideoId]);

    const subtitleMode = useMemo<SubtitlePreferenceMode>(() => {
        if (subtitlePreferenceMode === 'always') return 'always';
        if (subtitlePreferenceMode === 'on' && showSubtitleOption) return 'on';
        return 'off';
    }, [showSubtitleOption, subtitlePreferenceMode]);

    const handleSubtitleModeChange = useCallback((mode: SubtitlePreferenceMode) => {
        setSubtitlePreferenceMode(mode);
    }, [setSubtitlePreferenceMode]);

    const isViewTrackingEnabled = Boolean(
        activeVideo?.id &&
        user?.id &&
        activeTab === 'foryou' &&
        isAppActive &&
        isScreenFocused &&
        !isPaused &&
        !isInAppBrowserVisible
    );

    useVideoViewTracking({
        videoId: activeVideo?.id,
        userId: user?.id,
        enabled: isViewTrackingEnabled,
    });

    const resolvedActiveIndex = useMemo(() => {
        if (activeVideoId) {
            const matchedIndex = videos.findIndex((video) => video.id === activeVideoId);
            if (matchedIndex >= 0) return matchedIndex;
        }
        if (activeIndex >= 0 && activeIndex < videos.length) return activeIndex;
        return -1;
    }, [activeIndex, activeVideoId, videos]);

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

    // ======================================================================== 
    // Modular Hooks Orchestration
    // ======================================================================== 

    const scrollApi = usePoolFeedScroll({
        videosRef, setActiveVideo, setCleanScreen,
        lastActiveIdRef, lastInternalIndex,
        setActiveTab: (tab) => setActiveTab(tab),
        setIsCarouselInteracting: (val) => setIsCarouselInteracting(val),
    });

    const videoCallbacks = usePoolFeedVideoCallbacks({
        videosRef,
        activeIndex: resolvedActiveIndex,
        activeVideoId,
        viewingMode,
        listRef,
    });

    const interactionApi = usePoolFeedInteractions({
        videosRef, toggleLike, togglePause, activeTab, setActiveTab,
        playbackRate, setRateLabel, videoPlayerRef, moreOptionsSheetRef,
        setIsCarouselInteracting,
    });

    const handleOpenEditScreen = useCallback((videoId: string) => {
        if (!videoId) return;
        router.push(`/edit?videoId=${encodeURIComponent(videoId)}` as any);
    }, [router]);

    const actionApi = usePoolFeedActions({
        activeVideo, activeVideoId, toggleLike, toggleSave, toggleFollow,
        toggleShare, deleteVideo, togglePause, openInAppBrowser,
        openEditScreen: handleOpenEditScreen,
        setCleanScreen, isCleanScreen, descriptionSheetRef, moreOptionsSheetRef,
        videoPlayerRef, activeTimeRef: videoCallbacks.activeTimeRef,
        insetTop: insets.top,
    });

    usePoolFeedLifecycleSync({
        videos, videosRef, activeVideoId, activeIndex: resolvedActiveIndex, isPaused, isAppActive,
        ignoreAppState, isInAppBrowserVisible, netInfo, uploadedVideoId, uploadedVideoPayload,
        uploadStatus, resetUpload, prependVideo, setActiveVideo, togglePause,
        tryConsumeUploadSuccess,
        setPaused, setScreenFocused, setActiveTab, listRef,
        lastActiveIdRef, lastInternalIndex,
        resetPlayback: videoCallbacks.resetPlayback,
    });

    // Keep store index aligned with activeVideoId across feeds.
    // If the clicked video is not in the current page yet, inject handoff payload and play it immediately.
    useEffect(() => {
        if (!activeVideoId) return;

        const isPendingHandoff = pendingOpenVideo?.id === activeVideoId;
        const enforceAutoplayNow = () => {
            setScreenFocused(true);
            setPaused(false);
            requestAnimationFrame(() => setPaused(false));
            setTimeout(() => setPaused(false), 120);
        };

        const matchedIndex = videos.findIndex((video) => video.id === activeVideoId);
        if (matchedIndex >= 0) {
            if (isPendingHandoff) {
                enforceAutoplayNow();
                clearPendingOpenVideo();
                lastInternalIndex.current = matchedIndex;
                lastActiveIdRef.current = activeVideoId;
                setActiveVideo(activeVideoId, matchedIndex);
                requestAnimationFrame(() => {
                    listRef.current?.scrollToOffset({ offset: matchedIndex * ITEM_HEIGHT, animated: false });
                    setPaused(false);
                });
                return;
            }

            if (matchedIndex === activeIndex) return;
            lastInternalIndex.current = matchedIndex;
            lastActiveIdRef.current = activeVideoId;
            setActiveVideo(activeVideoId, matchedIndex);
            requestAnimationFrame(() => {
                listRef.current?.scrollToOffset({ offset: matchedIndex * ITEM_HEIGHT, animated: false });
            });
            return;
        }

        if (!prependVideo || !isPendingHandoff || !pendingOpenVideo) return;

        enforceAutoplayNow();
        prependVideo(pendingOpenVideo);
        clearPendingOpenVideo();
        lastInternalIndex.current = 0;
        lastActiveIdRef.current = activeVideoId;
        setActiveVideo(activeVideoId, 0);
        requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
            setPaused(false);
        });
    }, [
        activeIndex,
        activeVideoId,
        clearPendingOpenVideo,
        pendingOpenVideo,
        prependVideo,
        setPaused,
        setScreenFocused,
        setActiveVideo,
        videos,
    ]);

    useEffect(() => {
        if (homeReselectTrigger <= 0) return;
        if (homeReselectTrigger === lastHandledReselectRef.current) return;
        lastHandledReselectRef.current = homeReselectTrigger;
        if (videos.length === 0) return;

        const firstVideo = videos[0];
        if (!firstVideo) return;

        setActiveTab('foryou');
        setIsCarouselInteracting(false);
        setCleanScreen(false);
        lastInternalIndex.current = 0;
        lastActiveIdRef.current = firstVideo.id;
        setActiveVideo(firstVideo.id, 0);

        requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
    }, [homeReselectTrigger, videos, setActiveVideo, setCleanScreen]);

    // ======================================================================== 
    // Callbacks & Render Helpers
    // ======================================================================== 

    const handleSwipeLeft = useCallback(() => {
        if (!activeVideo?.user?.id) return;
        router.push(isOwnActiveVideo ? '/profile' : `/user/${activeVideo.user.id}` as any);
    }, [activeVideo?.user?.id, isOwnActiveVideo, router]);

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
        currentTimeSV: videoCallbacks.currentTimeSV,
        durationSV: videoCallbacks.durationSV,
    }), [isPaused, videoCallbacks.hasVideoError, videoCallbacks.retryCount, rateLabel, interactionApi.tapIndicator, videoCallbacks.currentTimeSV, videoCallbacks.durationSV]);

    const overlayActions = useMemo(() => ({
        onBack: () => router.navigate('/' as any),
        onUploadPress: () => router.push('/upload'),
        onStoryAvatarPress: (userId: string) => router.push(`/story/${userId}` as any),
        onCloseStoryBar: () => setActiveTab('foryou'),
        onCleanScreen: actionApi.handleCleanScreen,
        onSheetEdit: actionApi.handleSheetEdit,
        onSheetDelete: actionApi.handleSheetDelete,
        onFollowPress: actionApi.handleToggleFollow,
        onDescriptionChange: (index: number) => index > 0 && !isPaused && togglePause(),
        onLike: actionApi.handleToggleLike,
        onSave: actionApi.handleToggleSave,
        onShare: actionApi.handleToggleShare,
        onShop: actionApi.handleOpenShopping,
        onDescription: actionApi.handleOpenDescription,
        onActionPressIn: interactionApi.handleActionPressIn,
        onActionPressOut: interactionApi.handleActionPressOut,
        playbackController: {
            seekTo: actionApi.seekTo,
            retryActive: actionApi.retryActive
        }
    }), [router, actionApi, interactionApi, isPaused, togglePause]);

    const overlayItems = useMemo(() => {
        if (!videos.length || resolvedActiveIndex < 0) return [];
        const startIndex = Math.max(0, resolvedActiveIndex - FEED_CONFIG.UI_PRELOAD_BEHIND_COUNT);
        const endIndex = Math.min(videos.length - 1, resolvedActiveIndex + FEED_CONFIG.UI_PRELOAD_AHEAD_COUNT);
        const items = [];
        for (let index = startIndex; index <= endIndex; index += 1) {
            const video = videos[index];
            if (!video) continue;
            items.push({
                video,
                index,
                isPlayable: isFeedVideoItem(video),
            });
        }
        return items;
    }, [videos, resolvedActiveIndex]);

    const renderItem = useCallback(({ item }: { item: PoolFeedVideo }) => (
        <PoolFeedScrollPlaceholder
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
            <PoolFeedStatusViews
                isLoading={isLoading} isRefreshing={isRefreshing} error={error}
                videosCount={videos.length} refreshFeed={refreshFeed}
                isCleanScreen={isCleanScreen}
                onBack={() => router.navigate('/' as any)}
                onUploadPress={() => router.push('/upload')}
            />
        );
    }

    return (
        <SwipeWrapper
            onSwipeLeft={isDisabled('DISABLE_INTERACTION_HANDLING') ? undefined : handleSwipeLeft}
            onSwipeRight={isDisabled('DISABLE_INTERACTION_HANDLING') ? undefined : () => router.push('/upload')}
            disabled={isDisabled('DISABLE_INTERACTION_HANDLING')}
        >
            <View style={styles.container}>
                <PoolFeedVideoPlayerPool
                    ref={videoPlayerRef}
                    videos={videos} activeIndex={resolvedActiveIndex}
                    isMuted={isMuted} isPaused={isPaused} playbackRate={playbackRate}
                    onPlaybackRateChange={setPlaybackRate}
                    onVideoLoaded={videoCallbacks.handleVideoLoaded}
                    onVideoError={videoCallbacks.handleVideoError}
                    onProgress={videoCallbacks.handleVideoProgress}
                    onVideoEnd={videoCallbacks.handleVideoEnd}
                    onRemoveVideo={videoCallbacks.handleRemoveVideo}
                    scrollY={scrollApi.scrollY}
                />

                <PoolFeedBrightnessOverlay />

                <View style={styles.scrollLayer}>
                    <AnimatedFlashList
                        // @ts-ignore
                        ref={listRef}
                        data={videos}
                        renderItem={renderItem}
                        estimatedItemSize={ITEM_HEIGHT}
                        overrideItemLayout={(layout) => layout.size = ITEM_HEIGHT}
                        keyExtractor={(item: PoolFeedVideo) => item.id}
                        updateCellsBatchingPeriod={8}
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
                        maxToRenderPerBatch={2}
                        windowSize={5}
                        drawDistance={ITEM_HEIGHT * 2}
                        scrollEnabled={!isCarouselInteracting}
                        onScroll={scrollApi.scrollHandler}
                        scrollEventThrottle={32}
                        onMomentumScrollEnd={(e: any) => scrollApi.handleScrollEnd(e, videos.length, listRef)}
                    />
                </View>

                {!isDisabled('DISABLE_ACTIVE_VIDEO_OVERLAY') && (
                    <PoolFeedOverlays
                        ref={overlaysRef as any}
                        moreOptionsSheetRef={moreOptionsSheetRef}
                        descriptionSheetRef={descriptionSheetRef}
                        activeVideo={activeVideo} activeVideoId={activeVideoId}
                        currentUserId={user?.id || null}
                        isOwnActiveVideo={isOwnActiveVideo}
                        showSubtitleOption={showSubtitleOption}
                        subtitleMode={subtitleMode}
                        onSubtitleModeChange={handleSubtitleModeChange}
                        isCleanScreen={isCleanScreen} isSeeking={isSeeking}
                        activeTab={activeTab}
                        showStories={showStories}
                        storyUsers={storyUsers} uiOpacityStyle={uiOpacityStyle}
                        overlayItems={overlayItems}
                        activeIndex={resolvedActiveIndex} isPlayable={isActivePlayable}
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
