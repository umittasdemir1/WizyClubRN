# mobile/app/(tabs)/index.tsx

Home tab ekrani. useVideoFeed verisini InfiniteFeedManager ile baglar.

```tsx
import React from 'react';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { InfiniteFeedManager } from '../../src/presentation/components/infiniteFeed/InfiniteFeedManager';
export default function HomeFeedScreen() {
    const {
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
        toggleShare,
        toggleShop,
    } = useVideoFeed();

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

```
