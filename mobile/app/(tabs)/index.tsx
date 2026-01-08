import { FeedManager } from '../../src/presentation/components/feed/FeedManager';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { useActiveVideoStore } from '../../src/presentation/store/useActiveVideoStore';
import { useEffect } from 'react';

export default function FeedScreen() {
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

    const customFeed = useActiveVideoStore((state) => state.customFeed);

    // In the main tab, we don't want the customFeed to override unless it was intended.
    // BUT the current implementation of customFeed is global.
    // If we want to "Separate them", then index.tsx should ALWAYS show discovery feed.
    // AND custom-feed.tsx should always show custom feed.

    // For now, let's make index.tsx ONLY show regularVideos.
    const videos = regularVideos;
    const isLoading = isLoadingRegular;
    const error = errorRegular;

    useEffect(() => {
        console.log(`[FeedScreen] Discovery feed ready with ${videos.length} videos`);
    }, [videos]);

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
