import { FlashList } from '@shopify/flash-list';
import { Dimensions, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoLayer } from '../../src/presentation/components/feed/VideoLayer';
import { ActionButtons } from '../../src/presentation/components/feed/ActionButtons';
import { HeaderOverlay } from '../../src/presentation/components/feed/HeaderOverlay';
import { MetadataLayer } from '../../src/presentation/components/feed/MetadataLayer';
import { DoubleTapLike } from '../../src/presentation/components/feed/DoubleTapLike';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { Video } from '../../src/domain/entities/Video';
import { useState, useRef, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FeedScreen() {
    const { videos, isLoading, toggleLike } = useVideoFeed();
    const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const insets = useSafeAreaInsets();
    const router = useRouter();

    // Mock data for stories
    const hasUnseenStories = true;

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setActiveVideoId(viewableItems[0].item.id);
        }
    }).current;

    const renderItem = useCallback(({ item }: { item: Video }) => {
        const isActive = item.id === activeVideoId;
        return (
            <View style={[styles.itemContainer, { height: SCREEN_HEIGHT }]}>
                <DoubleTapLike onDoubleTap={() => toggleLike(item.id)}>
                    {/* LAYER 0: Video (Z-0) */}
                    <View style={StyleSheet.absoluteFill}>
                        <VideoLayer
                            video={item}
                            isActive={isActive}
                            isMuted={isMuted}
                        />
                        {/* Gradient Overlay */}
                        <LinearGradient
                            colors={['rgba(0,0,0,0.2)', 'transparent', 'rgba(0,0,0,0.6)']}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>

                    {/* LAYER 1: Header Overlay (Z-20) */}
                    <HeaderOverlay
                        isMuted={isMuted}
                        onToggleMute={() => setIsMuted(!isMuted)}
                        onStoryPress={() => router.push('/story/1')}
                        onMorePress={() => console.log('Open More Options')}
                        hasUnseenStories={hasUnseenStories}
                    />

                    {/* LAYER 2: Right Action Bar (Z-30) */}
                    <View style={styles.actionsContainer}>
                        <ActionButtons
                            video={item}
                            onLike={() => toggleLike(item.id)}
                            onSave={() => console.log('Save')}
                            onShare={() => console.log('Share')}
                            onShop={() => console.log('Shop')}
                            onProfilePress={() => console.log('Profile')}
                        />
                    </View>

                    {/* LAYER 3: Metadata (Z-20) */}
                    <MetadataLayer
                        video={item}
                        onAvatarPress={() => console.log('Open Story/Profile')}
                        onFollowPress={() => console.log('Follow')}
                        onReadMorePress={() => console.log('Open Description')}
                    />

                    {/* LAYER 5: Bottom Navigation is handled by _layout.tsx (Z-40) */}
                </DoubleTapLike>
            </View>
        );
    }, [activeVideoId, isMuted, toggleLike, router]);

    return (
        <View style={styles.container}>
            <FlashList<Video>
                data={videos}
                renderItem={renderItem}
                estimatedItemSize={SCREEN_HEIGHT}
                pagingEnabled
                decelerationRate="fast"
                snapToInterval={SCREEN_HEIGHT}
                snapToAlignment="start"
                showsVerticalScrollIndicator={false}
                viewabilityConfig={{
                    itemVisiblePercentThreshold: 60
                }}
                onViewableItemsChanged={onViewableItemsChanged}
                keyExtractor={(item: Video) => item.id}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    itemContainer: {
        width: '100%',
        height: SCREEN_HEIGHT,
        position: 'relative',
    },
    actionsContainer: {
        position: 'absolute',
        right: 16,
        bottom: 110,
        zIndex: 30,
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
    },
});
