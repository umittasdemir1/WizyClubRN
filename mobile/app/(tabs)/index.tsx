import { FeedManager } from '../../src/presentation/components/feed/FeedManager';
import { InfiniteFeedManager } from '../../src/presentation/components/infiniteFeed/InfiniteFeedManager';
import { FEED_FLAGS } from '../../src/presentation/components/feed/hooks/useFeedConfig';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { useActiveVideoStore } from '../../src/presentation/store/useActiveVideoStore';
import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { logVideo, LogCode } from '@/core/services/Logger';

export default function HomeFeedScreen() {
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

    const videos = regularVideos;
    const isLoading = isLoadingRegular;
    const error = errorRegular;

    // Debug logging
    useEffect(() => {
        if (videos.length > 0) {
            logVideo(LogCode.VIDEO_FEED_READY, 'Home feed ready', {
                videoCount: videos.length,
                mode: FEED_FLAGS.USE_INFINITE_FEED ? 'infinite' : 'pool'
            });
        }
    }, [videos.length]);

    // Focus/blur handling
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

    // 🔀 Conditional render based on USE_INFINITE_FEED flag
    if (FEED_FLAGS.USE_INFINITE_FEED) {
        return (
            <InfiniteFeedManager
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
                toggleShare={toggleShare}
                toggleShop={toggleShop}
            />
        );
    }

    // Pool-based TikTok feed (default when flag is false)
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
