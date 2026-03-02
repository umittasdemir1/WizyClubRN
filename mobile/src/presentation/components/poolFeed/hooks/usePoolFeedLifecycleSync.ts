import { useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { SystemBars } from 'react-native-edge-to-edge';
import { useActiveVideoStore } from '../../../store/useActiveVideoStore';
import { FeedPrefetchService } from '../../../../data/services/FeedPrefetchService';
import { FeedQueryService } from '../../../../data/services/FeedQueryService';
import { logUI, LogCode } from '@/core/services/Logger';
import { Video } from '../../../../domain/entities/Video';

interface LifecycleSyncOptions {
    videos: Video[];
    videosRef: React.MutableRefObject<Video[]>;
    activeVideoId: string | null;
    activeIndex: number;
    isPaused: boolean;
    isAppActive: boolean;
    ignoreAppState: boolean;
    isInAppBrowserVisible: boolean;
    netInfo: any;
    uploadedVideoId: string | null;
    uploadStatus: string;
    resetUpload: () => void;
    prependVideo?: (video: Video) => void;
    setActiveVideo: (id: string | null, index: number) => void;
    togglePause: () => void;
    setPaused: (paused: boolean) => void;
    setScreenFocused: (focused: boolean) => void;
    setActiveTab: (tab: 'stories' | 'foryou') => void;
    listRef: React.RefObject<any>;
    resetPlayback: () => void;
    lastActiveIdRef: React.MutableRefObject<string | null>;
    lastInternalIndex: React.MutableRefObject<number>;
}

export function usePoolFeedLifecycleSync(options: LifecycleSyncOptions) {
    const {
        videos,
        videosRef,
        activeVideoId,
        activeIndex,
        isPaused,
        isAppActive,
        ignoreAppState,
        isInAppBrowserVisible,
        netInfo,
        uploadedVideoId,
        uploadStatus,
        resetUpload,
        prependVideo,
        setActiveVideo,
        togglePause,
        setPaused,
        setScreenFocused,
        setActiveTab,
        listRef,
        resetPlayback,
        lastActiveIdRef,
        lastInternalIndex,
    } = options;

    const wasPlayingBeforeWebViewRef = useRef(false);
    const wasPlayingBeforeBackgroundRef = useRef(false);
    const wasPlayingBeforeBlurRef = useRef(false);
    const feedQueryServiceRef = useRef(new FeedQueryService());

    // 1. Keep videosRef in sync
    useEffect(() => {
        videosRef.current = videos;
    }, [videos]);

    // 2. Network type for prefetch
    useEffect(() => {
        FeedPrefetchService.getInstance().setNetworkType(netInfo.type);
    }, [netInfo.type]);

    // 3. Debug logging
    useEffect(() => {
        if (__DEV__) {
            logUI(LogCode.DEBUG_INFO, 'FeedManager isPaused state', { isPaused, activeIndex, activeVideoId });
        }
    }, [isPaused, activeIndex, activeVideoId]);

    // 4. In-App Browser sync
    useEffect(() => {
        if (isInAppBrowserVisible) {
            const currentIsPaused = useActiveVideoStore.getState().isPaused;
            wasPlayingBeforeWebViewRef.current = !currentIsPaused;
            if (!currentIsPaused) {
                togglePause();
            }
            return;
        }

        if (wasPlayingBeforeWebViewRef.current) {
            const currentIsPaused = useActiveVideoStore.getState().isPaused;
            if (currentIsPaused) {
                togglePause();
            }
            wasPlayingBeforeWebViewRef.current = false;
        }
    }, [isInAppBrowserVisible, togglePause]);

    // 5. App State sync
    useEffect(() => {
        if (ignoreAppState || isInAppBrowserVisible) return;

        if (!isAppActive) {
            const currentIsPaused = useActiveVideoStore.getState().isPaused;
            wasPlayingBeforeBackgroundRef.current = !currentIsPaused;
            if (!currentIsPaused) {
                setPaused(true);
            }
            return;
        }

        if (wasPlayingBeforeBackgroundRef.current) {
            const currentIsPaused = useActiveVideoStore.getState().isPaused;
            if (currentIsPaused) {
                setPaused(false);
            }
            wasPlayingBeforeBackgroundRef.current = false;
        }
    }, [ignoreAppState, isAppActive, isInAppBrowserVisible, setPaused]);

    // 6. Focus/Blur sync
    useFocusEffect(
        useCallback(() => {
            setScreenFocused(true);
            setActiveTab('foryou');
            SystemBars.setStyle({ statusBar: 'light', navigationBar: 'light' });

            if (wasPlayingBeforeBlurRef.current) {
                const currentIsPaused = useActiveVideoStore.getState().isPaused;
                if (currentIsPaused) {
                    setPaused(false);
                }
                wasPlayingBeforeBlurRef.current = false;
            }

            return () => {
                const currentIsPaused = useActiveVideoStore.getState().isPaused;
                wasPlayingBeforeBlurRef.current = !currentIsPaused;
                if (!currentIsPaused) {
                    setPaused(true);
                }
                setScreenFocused(false);
            };
        }, [setScreenFocused, setPaused, setActiveTab])
    );

    // 7. Initial activation
    useEffect(() => {
        if (videos.length > 0 && !activeVideoId) {
            setActiveVideo(videos[0].id, 0);
            lastActiveIdRef.current = videos[0].id;
        }
    }, [videos, activeVideoId, setActiveVideo]);

    // 8. Sync scroll index
    useEffect(() => {
        if (videos.length === 0) return;
        if (activeIndex < 0 || activeIndex >= videos.length) return;
        if (activeIndex === lastInternalIndex.current) return;

        listRef.current?.scrollToIndex({ index: activeIndex, animated: false });
        lastInternalIndex.current = activeIndex;
    }, [activeIndex, videos.length]);

    // 9. Reset playback on video change
    useEffect(() => {
        resetPlayback();
    }, [activeVideoId]);

    // 10. Handle upload success
    useEffect(() => {
        if (uploadedVideoId && uploadStatus === 'success' && prependVideo) {
            const handleUploadSuccess = async () => {
                const newVideo = await feedQueryServiceRef.current.waitForVideoForFeed(uploadedVideoId, {
                    attempts: 5,
                    delayMs: 120,
                });

                if (newVideo) {
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
    }, [uploadedVideoId, uploadStatus, prependVideo, setActiveVideo, resetUpload]);
}
