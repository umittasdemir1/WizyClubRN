import { PoolFeedManager } from '../../src/presentation/components/poolFeed/PoolFeedManager';
import { InfiniteFeedManager } from '../../src/presentation/components/infiniteFeed/InfiniteFeedManager';
import { FEED_MODE_FLAGS } from '../../src/presentation/config/feedModeConfig';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { useActiveVideoStore } from '../../src/presentation/store/useActiveVideoStore';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { logVideo, LogCode } from '@/core/services/Logger';

export default function HomeFeedScreen() {
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const [homeReselectTrigger, setHomeReselectTrigger] = useState(0);
    const setPaused = useActiveVideoStore((state) => state.setPaused);
    const setScreenFocused = useActiveVideoStore((state) => state.setScreenFocused);
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
                mode: FEED_MODE_FLAGS.USE_INFINITE_FEED ? 'infinite' : 'pool'
            });
        }
    }, [videos.length]);

    // Focus/blur handling
    useFocusEffect(
        useCallback(() => {
            setScreenFocused(true);
            setPaused(false);

            return () => {
                setPaused(true);
                setScreenFocused(false);
            };
        }, [setPaused, setScreenFocused])
    );

    useEffect(() => {
        const unsubscribe = navigation.addListener('tabPress', () => {
            if (!isFocused) return;
            setHomeReselectTrigger((prev) => prev + 1);
        });
        return unsubscribe;
    }, [isFocused, navigation]);

    // 🔀 Conditional render based on USE_INFINITE_FEED flag
    if (FEED_MODE_FLAGS.USE_INFINITE_FEED) {
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
                toggleFollow={toggleFollow}
                toggleShare={toggleShare}
                toggleShop={toggleShop}
                deleteVideo={deleteVideo}
                prependVideo={prependVideo}
                homeReselectTrigger={homeReselectTrigger}
            />
        );
    }

    // Pool-based TikTok feed (default when flag is false)
    return (
        <PoolFeedManager
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
            homeReselectTrigger={homeReselectTrigger}
        />
    );
}
