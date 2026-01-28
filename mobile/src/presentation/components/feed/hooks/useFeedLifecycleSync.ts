import { useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { SystemBars } from 'react-native-edge-to-edge';
import { useActiveVideoStore } from '../../../store/useActiveVideoStore';
import { FeedPrefetchService } from '../../../../data/services/FeedPrefetchService';
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
    isCustomFeed: boolean;
    lastActiveIdRef: React.MutableRefObject<string | null>;
    lastInternalIndex: React.MutableRefObject<number>;
}

export function useFeedLifecycleSync(options: LifecycleSyncOptions) {
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
        isCustomFeed,
        lastActiveIdRef,
        lastInternalIndex,
    } = options;

    const wasPlayingBeforeWebViewRef = useRef(false);
    const wasPlayingBeforeBackgroundRef = useRef(false);
    const wasPlayingBeforeBlurRef = useRef(false);

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
        if (videos.length > 0 && activeIndex !== lastInternalIndex.current) {
            listRef.current?.scrollToIndex({ index: activeIndex, animated: false });
            lastInternalIndex.current = activeIndex;
        }
    }, [activeIndex, videos.length]);

    // 9. Reset playback on video change
    useEffect(() => {
        resetPlayback();
    }, [activeVideoId]);

    // 10. Handle upload success
    useEffect(() => {
        if (uploadedVideoId && uploadStatus === 'success' && prependVideo && !isCustomFeed) {
            const handleUploadSuccess = async () => {
                const { supabase } = require('../../../../core/supabase');
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
    }, [uploadedVideoId, uploadStatus, prependVideo, isCustomFeed, setActiveVideo, resetUpload]);
}
