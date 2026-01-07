import React, { memo, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { SharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VideoLayer } from './VideoLayer';
import { ActionButtons, ActionButtonsRef } from './ActionButtons';
import { MetadataLayer } from './MetadataLayer';
import { DoubleTapLike, DoubleTapLikeRef } from './DoubleTapLike';
import { Video } from '../../../domain/entities/Video';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_HEIGHT = Dimensions.get('window').height;

interface FeedItemProps {
    video: Video;
    isActive: boolean;
    isMuted: boolean;
    isScrolling: SharedValue<boolean>;
    isSeeking: boolean;
    uiOpacityStyle: any;
    onDoubleTapLike: (videoId: string) => void;
    onFeedTap: () => void;
    onSeekReady?: (seekFn: (time: number) => void) => void;
    onRemoveVideo: (videoId: string) => void;
    onToggleLike: (videoId: string) => void;
    onToggleSave: (videoId: string) => void;
    onToggleShare: (videoId: string) => void;
    onToggleFollow: (videoId: string) => void;
    onOpenShopping: () => void;
    onOpenDescription: () => void;
    currentUserId?: string;
}

export const FeedItem = memo(function FeedItem({
    video,
    isActive,
    isMuted,
    isScrolling,
    isSeeking,
    uiOpacityStyle,
    currentUserId,
    onDoubleTapLike,
    onFeedTap,
    onSeekReady,
    onRemoveVideo,
    onToggleLike,
    onToggleSave,
    onToggleShare,
    onToggleFollow,
    onOpenShopping,
    onOpenDescription,
}: FeedItemProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const doubleTapRef = useRef<DoubleTapLikeRef>(null);
    const actionButtonsRef = useRef<ActionButtonsRef>(null);

    const handleDoubleTap = useCallback(() => {
        // DoubleTapLike already handles the center heart animation
        // We just need to trigger the BUTTON animation
        actionButtonsRef.current?.animateLike();

        // 🔥 DELAY state update (like button press does it immediately, but double-tap needs delay)
        setTimeout(() => {
            onDoubleTapLike(video.id);
        }, 16); // Single frame delay
    }, [video.id, onDoubleTapLike]);

    const handleLikePress = useCallback(() => {
        if (!video.isLiked) {
            doubleTapRef.current?.animateLike();
        }
        // 🔥 IMMEDIATE: No delay, no InteractionManager
        onToggleLike(video.id);
    }, [video.isLiked, video.id, onToggleLike]);

    return (
        <View style={[styles.itemContainer, { height: ITEM_HEIGHT }]}>
            <DoubleTapLike
                ref={doubleTapRef}
                onDoubleTap={handleDoubleTap}
                onSingleTap={onFeedTap}
            >
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', paddingTop: insets.top }]}>
                    <VideoLayer
                        video={video}
                        isActive={isActive}
                        isMuted={isMuted}
                        isScrolling={isScrolling}
                        onSeekReady={isActive ? onSeekReady : undefined}
                        onRemoveVideo={() => onRemoveVideo(video.id)}
                    />
                </View>
            </DoubleTapLike>

            <Animated.View
                style={[StyleSheet.absoluteFill, { zIndex: 50, paddingTop: insets.top }, uiOpacityStyle]}
                pointerEvents={isSeeking ? 'none' : 'box-none'}
            >
                <ActionButtons
                    ref={actionButtonsRef}
                    isLiked={video.isLiked}
                    likesCount={video.likesCount}
                    isSaved={video.isSaved}
                    savesCount={video.savesCount || 0}
                    sharesCount={video.sharesCount}
                    shopsCount={video.shopsCount || 0}
                    videoId={video.id}
                    onLike={handleLikePress}
                    onSave={() => onToggleSave(video.id)}
                    onShare={() => onToggleShare(video.id)}
                    onShop={onOpenShopping}
                    onProfilePress={() => router.push(`/user/${video.user.id}`)}
                />

                <MetadataLayer
                    video={video}
                    currentUserId={currentUserId}
                    onAvatarPress={() => router.push(`/user/${video.user.id}`)}
                    onFollowPress={() => onToggleFollow(video.id)}
                    onReadMorePress={onOpenDescription}
                    onCommercialTagPress={() => console.log('Open Commercial Info')}
                />
            </Animated.View>
        </View>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.video.id === nextProps.video.id &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.isMuted === nextProps.isMuted &&
        prevProps.video.isLiked === nextProps.video.isLiked &&
        prevProps.video.isSaved === nextProps.video.isSaved &&
        prevProps.video.user.isFollowing === nextProps.video.user.isFollowing
    );
});

const styles = StyleSheet.create({
    itemContainer: {
        width: SCREEN_WIDTH,
        position: 'relative',
    },
});