import { FeedManager } from '../../src/presentation/components/feed/FeedManager';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { useActiveVideoStore } from '../../src/presentation/store/useActiveVideoStore';
import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { logVideo, LogCode } from '@/core/services/Logger';

export default function FeedScreen() {
    const isFocused = useIsFocused();
    const isPaused = useActiveVideoStore((state) => state.isPaused);
    const setPaused = useActiveVideoStore((state) => state.setPaused);
    const setScreenFocused = useActiveVideoStore((state) => state.setScreenFocused);
    const wasPausedBeforeBlur = useRef(false);
    const prevFocused = useRef(isFocused);
    const {
        videos: regularVideos,
        isLoading: isLoadingRegular,
        isRefreshing,
        isLoadingMore,
        hasMore,
        error: errorRegular,
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

    // Discovery feed always shows regularVideos (not customFeed)
    const videos = regularVideos;
    const isLoading = isLoadingRegular;
    const error = errorRegular;

    // Debug logging - only log when feed is initially loaded or significantly changes
    useEffect(() => {
        if (videos.length > 0) {
            logVideo(LogCode.VIDEO_FEED_READY, 'Discovery feed ready', { videoCount: videos.length });
        }
    }, [videos.length]); // Changed from [videos] to [videos.length] to reduce re-renders

    useEffect(() => {
        if (prevFocused.current === isFocused) return;

        if (!isFocused) {
            const pausedNow = useActiveVideoStore.getState().isPaused;
            wasPausedBeforeBlur.current = pausedNow;
            if (!pausedNow) {
                setPaused(true);
            }
            setScreenFocused(false);
            prevFocused.current = isFocused;
            return;
        }

        setScreenFocused(true);
        if (!wasPausedBeforeBlur.current) {
            setPaused(false);
        }
        prevFocused.current = isFocused;
    }, [isFocused, setPaused, setScreenFocused]);

    return (
        <FeedManager
            videos={videos}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            error={error}
            refreshFeed={refreshFeed}
            loadMore={loadMore}
            toggleLike={toggleLike}
            toggleSave={toggleSave}
            toggleFollow={toggleFollow}
            toggleShare={toggleShare}
            toggleShop={toggleShop}
            deleteVideo={deleteVideo}
            prependVideo={prependVideo}
            showStories={true}
            isCustomFeed={false}
        />
    );
}
