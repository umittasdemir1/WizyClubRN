import { FeedManager } from '../src/presentation/components/feed/FeedManager';
import { useVideoFeed } from '../src/presentation/hooks/useVideoFeed';
import { useActiveVideoStore } from '../src/presentation/store/useActiveVideoStore';
import { Stack } from 'expo-router';

export default function CustomFeedScreen() {
    const {
        isRefreshing,
        toggleLike,
        toggleSave,
        toggleFollow,
        toggleShare,
        toggleShop,
        deleteVideo,
    } = useVideoFeed();

    const customFeed = useActiveVideoStore((state) => state.customFeed);

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <FeedManager
                videos={customFeed || []}
                isLoading={false}
                isRefreshing={isRefreshing}
                error={null}
                refreshFeed={() => { }} // No refresh for custom feed for now, or use provided refresh
                toggleLike={toggleLike}
                toggleSave={toggleSave}
                toggleFollow={toggleFollow}
                toggleShare={toggleShare}
                toggleShop={toggleShop}
                deleteVideo={deleteVideo}
                showStories={false} // Don't show stories on custom feeds
                isCustomFeed={true}
            />
        </>
    );
}
