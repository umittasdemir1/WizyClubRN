import { PoolFeedManager } from '../../src/presentation/components/poolFeed/PoolFeedManager';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { useActiveVideoStore } from '../../src/presentation/store/useActiveVideoStore';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { InteractionManager } from 'react-native';
import { SwipeWrapper } from '../../src/presentation/components/shared/SwipeWrapper';

export default function VideosScreen() {
    const router = useRouter();
    const navigation = useNavigation<any>();
    const isFocused = useIsFocused();
    const [videosReselectTrigger, setVideosReselectTrigger] = useState(0);
    const setPaused = useActiveVideoStore((state) => state.setPaused);
    const setScreenFocused = useActiveVideoStore((state) => state.setScreenFocused);
    const {
        videos,
        isLoading,
        isRefreshing,
        isLoadingMore,
        hasMore,
        error,
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

    useFocusEffect(
        useCallback(() => {
            const enforcePlaybackReady = () => {
                setScreenFocused(true);
                setPaused(false);
            };

            enforcePlaybackReady();
            const frameId = requestAnimationFrame(enforcePlaybackReady);
            const interactionHandle = InteractionManager.runAfterInteractions(enforcePlaybackReady);
            const timeoutId = setTimeout(enforcePlaybackReady, 150);

            return () => {
                cancelAnimationFrame(frameId);
                interactionHandle.cancel();
                clearTimeout(timeoutId);
                setPaused(true);
                setScreenFocused(false);
            };
        }, [setPaused, setScreenFocused])
    );

    useEffect(() => {
        const unsubscribe = navigation.addListener('tabPress', () => {
            if (!isFocused) return;
            setVideosReselectTrigger((prev) => prev + 1);
        });

        return unsubscribe;
    }, [isFocused, navigation]);

    return (
        <SwipeWrapper
            onSwipeRight={() => router.navigate('/deals')}
            onSwipeLeft={() => router.navigate('/profile')}
            edgeOnly={true}
        >
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
            homeReselectTrigger={videosReselectTrigger}
        />
        </SwipeWrapper>
    );
}
