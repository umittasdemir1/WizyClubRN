/**
 * useFeedActions - Feed Action Handlers Hook
 *
 * Handles all action-related logic for the feed:
 * - Like, Save, Share, Follow actions
 * - Shopping link handling
 * - Delete confirmation
 * - Toast notifications
 *
 * @module presentation/components/feed/hooks/useFeedActions
 */

import { useCallback, useRef, useState } from 'react';
import { Share, Alert, Animated as RNAnimated, Easing } from 'react-native';
import { FEED_FLAGS } from './useFeedConfig';
import { Video } from '../../../../domain/entities/Video';
import { useActiveVideoStore } from '../../../store/useActiveVideoStore';
import { LogCode, logError } from '../../../../core/services/Logger';

// ============================================================================
// Types
// ============================================================================

export interface UseFeedActionsOptions {
    /** Active video object */
    activeVideo: Video | null;
    /** Active video ID */
    activeVideoId: string | null;
    /** Toggle like function */
    toggleLike: (videoId: string) => void;
    /** Toggle save function */
    toggleSave: (videoId: string) => void;
    /** Toggle follow function */
    toggleFollow: (videoId: string) => void;
    /** Toggle share function */
    toggleShare: (videoId: string) => void;
    /** Delete video function */
    deleteVideo: (videoId: string) => void;
    /** Toggle pause function */
    togglePause: () => void;
    /** Open in-app browser function */
    openInAppBrowser: (url: string) => void;
    /** Set clean screen function */
    setCleanScreen: (value: boolean) => void;
    /** Is clean screen state */
    isCleanScreen: boolean;
    /** Description sheet ref */
    descriptionSheetRef: React.MutableRefObject<any>;
    /** More options sheet ref */
    moreOptionsSheetRef: React.MutableRefObject<any>;
    /** Video player ref */
    videoPlayerRef: React.MutableRefObject<any>;
    /** Active time ref */
    activeTimeRef: React.MutableRefObject<number>;
    /** Inset top for toast positioning */
    insetTop: number;
}

export interface UseFeedActionsReturn {
    /** Handle like toggle */
    handleToggleLike: () => void;
    /** Handle save toggle */
    handleToggleSave: () => void;
    /** Handle share action */
    handleToggleShare: () => Promise<void>;
    /** Handle follow toggle */
    handleToggleFollow: () => void;
    /** Handle shopping link */
    handleOpenShopping: () => void;
    /** Handle description sheet open */
    handleOpenDescription: () => void;
    /** Handle clean screen toggle */
    handleCleanScreen: () => void;
    /** Handle delete press */
    handleDeletePress: () => void;
    /** Handle sheet delete */
    handleSheetDelete: () => void;
    /** Confirm delete video */
    confirmDeleteVideo: () => void;
    /** Cancel delete */
    cancelDelete: () => void;
    /** Handle seek */
    seekTo: (time: number) => void;
    /** Handle retry */
    retryActive: () => void;
    /** Show save toast */
    showSaveToast: (message: string) => void;
    /** Save toast message */
    saveToastMessage: string | null;
    /** Save toast active state */
    saveToastActive: boolean;
    /** Set save toast active */
    setSaveToastActive: (value: boolean) => void;
    /** Save toast translate Y (animated value) */
    saveToastTranslateY: RNAnimated.Value;
    /** Save toast opacity (animated value) */
    saveToastOpacity: RNAnimated.Value;
    /** Is delete modal visible */
    isDeleteModalVisible: boolean;
    /** Set delete modal visible */
    setDeleteModalVisible: (value: boolean) => void;
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook for managing feed action handlers.
 *
 * @param options - Configuration options for the hook
 * @returns Action handlers and related state
 */
export function useFeedActions(options: UseFeedActionsOptions): UseFeedActionsReturn {
    const {
        activeVideo,
        activeVideoId,
        toggleLike,
        toggleSave,
        toggleFollow,
        toggleShare,
        deleteVideo,
        togglePause,
        openInAppBrowser,
        setCleanScreen,
        isCleanScreen,
        descriptionSheetRef,
        moreOptionsSheetRef,
        videoPlayerRef,
        activeTimeRef,
        insetTop,
    } = options;

    // ========================================================================
    // Local State
    // ========================================================================
    const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);
    const [saveToastActive, setSaveToastActive] = useState(false);
    const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
    const wasPlayingBeforeShareRef = useRef(false);

    // ========================================================================
    // Toast Animation Values
    // ========================================================================
    const saveToastTranslateY = useRef(new RNAnimated.Value(-70)).current;
    const saveToastOpacity = useRef(new RNAnimated.Value(0)).current;
    const saveToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ========================================================================
    // Show Save Toast
    // ========================================================================
    const showSaveToast = useCallback((message: string) => {
        if (FEED_FLAGS.DISABLE_ACTIONS) return;

        setSaveToastMessage(message);

        // Clear existing timeout
        if (saveToastTimeoutRef.current) {
            clearTimeout(saveToastTimeoutRef.current);
        }

        // Reset positions
        saveToastTranslateY.setValue(-70);
        saveToastOpacity.setValue(0);

        // Animate in
        RNAnimated.parallel([
            RNAnimated.timing(saveToastTranslateY, {
                toValue: 0, // Using 0 because FeedOverlays handles top offset
                duration: 250,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            RNAnimated.timing(saveToastOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto-hide after 2 seconds
        saveToastTimeoutRef.current = setTimeout(() => {
            RNAnimated.parallel([
                RNAnimated.timing(saveToastTranslateY, {
                    toValue: -70,
                    duration: 180,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
                RNAnimated.timing(saveToastOpacity, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setSaveToastMessage(null);
            });
        }, 2000);
    }, [saveToastOpacity, saveToastTranslateY, insetTop]);

    // ========================================================================
    // Action Handlers
    // ========================================================================

    const handleToggleLike = useCallback(() => {
        if (FEED_FLAGS.DISABLE_ACTIONS) return;
        if (activeVideo) toggleLike(activeVideo.id);
    }, [activeVideo, toggleLike]);

    const handleToggleSave = useCallback(() => {
        if (FEED_FLAGS.DISABLE_ACTIONS) return;
        if (!activeVideo) return;

        const nextSaved = !activeVideo.isSaved;
        toggleSave(activeVideo.id);
        setSaveToastActive(nextSaved);
        showSaveToast(nextSaved ? 'Kaydedilenlere eklendi' : 'Kaydedilenlerden kaldırıldı');
    }, [activeVideo, toggleSave, showSaveToast]);

    const handleToggleShare = useCallback(async () => {
        if (FEED_FLAGS.DISABLE_ACTIONS) return;
        if (!activeVideo) return;

        const shareUrl = `wizyclub://video/${activeVideo.id}`;
        const message = activeVideo.description ? `${activeVideo.description}\n${shareUrl}` : shareUrl;

        const wasPaused = useActiveVideoStore.getState().isPaused;
        wasPlayingBeforeShareRef.current = !wasPaused;

        try {
            useActiveVideoStore.getState().setIgnoreAppState(true);
            if (!wasPaused) useActiveVideoStore.getState().setPaused(true);
            await Share.share({ message, url: shareUrl });
            toggleShare(activeVideo.id);
        } catch (error) {
            logError(LogCode.ERROR_CAUGHT, 'Share failed', error);
        } finally {
            if (activeVideoId === activeVideo.id) {
                const resumeTime = activeTimeRef.current;
                if (resumeTime > 0) videoPlayerRef.current?.seekTo(resumeTime);
                if (wasPlayingBeforeShareRef.current) useActiveVideoStore.getState().setPaused(false);
            }
            useActiveVideoStore.getState().setIgnoreAppState(false);
        }
    }, [activeVideo, activeVideoId, toggleShare, activeTimeRef, videoPlayerRef]);

    const handleToggleFollow = useCallback(() => {
        if (FEED_FLAGS.DISABLE_ACTIONS) return;
        if (activeVideo) toggleFollow(activeVideo.id);
    }, [activeVideo, toggleFollow]);

    const handleOpenShopping = useCallback(() => {
        if (FEED_FLAGS.DISABLE_ACTIONS) return;

        if (!activeVideo?.brandUrl) {
            Alert.alert('Link bulunamadı', 'Bu video için bir alışveriş linki yok.');
            return;
        }

        const url = activeVideo.brandUrl.match(/^https?:\/\/./)
            ? activeVideo.brandUrl
            : `https://${activeVideo.brandUrl}`;
        openInAppBrowser(url);
    }, [activeVideo, openInAppBrowser]);

    const handleOpenDescription = useCallback(() => {
        if (FEED_FLAGS.DISABLE_OVERLAYS) return;

        descriptionSheetRef.current?.snapToIndex(0);
        if (!useActiveVideoStore.getState().isPaused) togglePause();
    }, [togglePause, descriptionSheetRef]);

    const handleCleanScreen = useCallback(() => {
        setCleanScreen(!isCleanScreen);
        moreOptionsSheetRef.current?.close();
        descriptionSheetRef.current?.close();
    }, [isCleanScreen, setCleanScreen, moreOptionsSheetRef, descriptionSheetRef]);

    const handleDeletePress = useCallback(() => {
        if (!activeVideoId) return;
        setDeleteModalVisible(true);
    }, [activeVideoId]);

    const handleSheetDelete = useCallback(() => {
        moreOptionsSheetRef.current?.close();
        handleDeletePress();
    }, [handleDeletePress, moreOptionsSheetRef]);

    const confirmDeleteVideo = useCallback(() => {
        if (activeVideoId) {
            deleteVideo(activeVideoId);
        }
        setDeleteModalVisible(false);
    }, [activeVideoId, deleteVideo]);

    const cancelDelete = useCallback(() => {
        setDeleteModalVisible(false);
    }, []);

    // ========================================================================
    // Playback Controls
    // ========================================================================

    const seekTo = useCallback((time: number) => {
        videoPlayerRef.current?.seekTo(time);
    }, [videoPlayerRef]);

    const retryActive = useCallback(() => {
        videoPlayerRef.current?.retryActive();
    }, [videoPlayerRef]);

    const setPlaybackRateViaController = useCallback((rate: number) => {
        if (videoPlayerRef.current?.setPlaybackRate) {
            videoPlayerRef.current.setPlaybackRate(rate);
            return;
        }
        useActiveVideoStore.getState().setPlaybackRate(rate);
    }, [videoPlayerRef]);

    // ========================================================================
    // Return
    // ========================================================================
    return {
        handleToggleLike,
        handleToggleSave,
        handleToggleShare,
        handleToggleFollow,
        handleOpenShopping,
        handleOpenDescription,
        handleCleanScreen,
        handleDeletePress,
        handleSheetDelete,
        confirmDeleteVideo,
        cancelDelete,
        seekTo,
        retryActive,
        showSaveToast,
        saveToastMessage,
        saveToastActive,
        setSaveToastActive,
        saveToastTranslateY,
        saveToastOpacity,
        isDeleteModalVisible,
        setDeleteModalVisible,
    };
}
