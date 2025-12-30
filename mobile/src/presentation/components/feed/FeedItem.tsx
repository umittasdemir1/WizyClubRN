import React, { memo, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';
import { SharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { VideoLayer } from './VideoLayer';
import { ActionButtons } from './ActionButtons';
import { MetadataLayer } from './MetadataLayer';
import { DoubleTapLike, DoubleTapLikeRef } from './DoubleTapLike';
import { Video } from '../../../domain/entities/Video';
import { useActiveVideoStore } from '../../store/useActiveVideoStore';

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
}

// 🔥 CRITICAL: Component defined OUTSIDE render function for proper memoization
export const FeedItem = memo(function FeedItem({
    video,
    isActive,
    isMuted,
    isScrolling,
    isSeeking,
    uiOpacityStyle,
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
    const doubleTapRef = useRef<DoubleTapLikeRef>(null);

    const handleLikePress = useCallback(() => {
        if (!video.isLiked) {
            doubleTapRef.current?.animateLike();
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            requestAnimationFrame(() => {
                onToggleLike(video.id);
            });
        } else {
            onToggleLike(video.id);
        }
    }, [video.isLiked, video.id, onToggleLike]);

    return (
        <View style={[styles.itemContainer, { height: ITEM_HEIGHT }]}>
            {/* Layer 1: Content & Gestures (Background) */}
            <DoubleTapLike
                ref={doubleTapRef}
                onDoubleTap={() => onDoubleTapLike(video.id)}
                onSingleTap={onFeedTap}
            >
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
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

            {/* Layer 2: UI Overlays (Foreground) - Animate Opacity */}
            <Animated.View
                style={[StyleSheet.absoluteFill, { zIndex: 50 }, uiOpacityStyle]}
                pointerEvents={isSeeking ? 'none' : 'box-none'}
            >
                <ActionButtons
                    isLiked={video.isLiked}
                    likesCount={video.likesCount}
                    isSaved={video.isSaved}
                    savesCount={video.savesCount || 0}
                    sharesCount={video.sharesCount}
                    shopsCount={video.shopsCount || 0}
                    onLike={handleLikePress}
                    onSave={() => onToggleSave(video.id)}
                    onShare={() => onToggleShare(video.id)}
                    onShop={onOpenShopping}
                    onProfilePress={() => router.push(`/user/${video.user.id}`)}
                />

                <MetadataLayer
                    video={video}
                    onAvatarPress={() => router.push(`/user/${video.user.id}`)}
                    onFollowPress={() => onToggleFollow(video.id)}
                    onReadMorePress={onOpenDescription}
                    onCommercialTagPress={() => console.log('Open Commercial Info')}
                />
            </Animated.View>
        </View>
    );
}, (prevProps, nextProps) => {
    // Custom comparison - only re-render if critical props change
    // This prevents re-render when other videos become active
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
