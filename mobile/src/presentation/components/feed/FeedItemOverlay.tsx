/**
 * FeedItemOverlay - UI-only Feed Item (No Video)
 * 
 * This component renders only the UI overlays (ActionButtons, MetadataLayer, etc.)
 * The actual video playback is handled by VideoPlayerPool.
 */

import React, { memo, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Platform, ActivityIndicator, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, withTiming, SharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButtons } from './ActionButtons';
import { MetadataLayer } from './MetadataLayer';
import { DoubleTapLike, DoubleTapLikeRef } from './DoubleTapLike';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import { VideoSeekBar } from './VideoSeekBar';
import { RefreshCcw, AlertCircle } from 'lucide-react-native';
import PlayIcon from '../../../../assets/icons/play.svg';
import ReplayIcon from '../../../../assets/icons/replay.svg';
import { logUI, LogCode } from '@/core/services/Logger';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_HEIGHT = Dimensions.get('window').height;

interface FeedItemOverlayProps {
    video: VideoEntity;
    isSeeking: boolean;
    uiOpacityStyle: any;
    onDoubleTapLike: (videoId: string) => void;
    onFeedTap: () => void;
    onToggleLike: (videoId: string) => void;
    onToggleSave: (videoId: string) => void;
    onToggleShare: (videoId: string) => void;
    onToggleFollow: (videoId: string) => void;
    onOpenShopping: () => void;
    onOpenDescription: () => void;
    currentUserId?: string;
    // 🔥 SYNC PROPS
    currentTimeSV: SharedValue<number>;
    durationSV: SharedValue<number>;
    onSeek: (time: number) => void;
    onRemoveVideo: (videoId: string) => void;
    isActive: boolean;
    isPaused: boolean;
    isFinished: boolean;
    hasError: boolean;
    retryCount: number;
    isLoading: boolean;
    onRetry?: () => void;
    index: number;
}

export const FeedItemOverlay = memo(function FeedItemOverlay({
    video,
    isSeeking,
    uiOpacityStyle,
    currentUserId,
    onDoubleTapLike,
    onFeedTap,
    onToggleLike,
    onToggleSave,
    onToggleShare,
    onToggleFollow,
    onOpenShopping,
    onOpenDescription,
    currentTimeSV,
    durationSV,
    onSeek,
    onRemoveVideo,
    isActive,
    isPaused,
    isFinished,
    hasError,
    retryCount,
    isLoading,
    onRetry,
    index,
}: FeedItemOverlayProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const doubleTapRef = useRef<DoubleTapLikeRef>(null);

    const handleLikePress = useCallback(() => {
        if (!video.isLiked) {
            doubleTapRef.current?.animateLike();
            requestAnimationFrame(() => {
                onToggleLike(video.id);
            });
        } else {
            onToggleLike(video.id);
        }
    }, [video.isLiked, video.id, onToggleLike]);

    const isSelfProfile = !!currentUserId && video.user.id === currentUserId;
    const profileRoute = isSelfProfile ? '/profile' : `/user/${video.user.id}`;

    const showPlayIcon = isActive && isPaused && !isFinished && !isLoading && !hasError;
    const showReplayIcon = isActive && isFinished && !isLoading && !hasError;

    return (
        <View style={[styles.itemContainer, { height: ITEM_HEIGHT }]} pointerEvents="box-none">
            {/* Layer 0: Video Background - Handled by VideoPlayerPool in background */}

            {/* Layer 1: Gesture Detection (Transparent) */}
            <DoubleTapLike
                ref={doubleTapRef}
                onDoubleTap={() => onDoubleTapLike(video.id)}
                onSingleTap={onFeedTap}
            >
                <View style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 80 }]} />
            </DoubleTapLike>

            {/* Layer 2: UI Overlays (Foreground) - Animate Opacity */}
            <Animated.View
                style={[StyleSheet.absoluteFill, { zIndex: 50, paddingTop: insets.top }, uiOpacityStyle]}
                pointerEvents={isSeeking ? 'none' : 'box-none'}
            >
                {/* Icons overlay */}
                <View style={styles.touchArea} pointerEvents="none">
                    {showPlayIcon && (
                        <View style={styles.iconContainer}>
                            <View style={styles.iconBackground}>
                                <PlayIcon width={32} height={32} color="#FFFFFF" />
                            </View>
                        </View>
                    )}
                    {showReplayIcon && (
                        <View style={styles.iconContainer}>
                            <View style={styles.iconBackground}>
                                <ReplayIcon width={32} height={32} color="#FFFFFF" />
                            </View>
                        </View>
                    )}
                </View>

                {/* Loading Indicator */}
                {isLoading && isActive && !hasError && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#FFFFFF" />
                    </View>
                )}

                {/* Error Overlay */}
                {hasError && isActive && (
                    <View style={[styles.touchArea, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                        <View style={styles.errorContainer}>
                            <AlertCircle color="#EF4444" size={48} style={{ marginBottom: 12 }} />
                            <Text style={styles.errorText}>Video oynatılamadı</Text>
                            <Pressable style={styles.retryButton} onPress={onRetry}>
                                <RefreshCcw color="#FFF" size={20} />
                                <Text style={styles.retryText}>Tekrar Dene</Text>
                            </Pressable>
                            {retryCount > 0 && (
                                <Text style={styles.retryCountText}>Deneme {retryCount}/3</Text>
                            )}
                        </View>
                    </View>
                )}

                <ActionButtons
                    videoId={video.id}
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
                    showShop={!!video.brandUrl}
                    onProfilePress={() => router.push(profileRoute as any)}
                />

                <MetadataLayer
                    video={video}
                    currentUserId={currentUserId}
                    onAvatarPress={() => router.push(profileRoute as any)}
                    onFollowPress={() => onToggleFollow(video.id)}
                    onReadMorePress={onOpenDescription}
                    onCommercialTagPress={() => logUI(LogCode.UI_INTERACTION, 'Commercial tag pressed', { videoId: video.id })}
                />

                {isActive && (
                    <VideoSeekBar
                        currentTime={currentTimeSV}
                        duration={durationSV}
                        onSeek={onSeek}
                        isActive={true}
                        spriteUrl={video.spriteUrl}
                        bottomOffset={-14}
                    />
                )}
            </Animated.View>
        </View>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.video.id === nextProps.video.id &&
        prevProps.video.isLiked === nextProps.video.isLiked &&
        prevProps.video.isSaved === nextProps.video.isSaved &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.isPaused === nextProps.isPaused &&
        prevProps.isFinished === nextProps.isFinished &&
        prevProps.hasError === nextProps.hasError &&
        prevProps.isLoading === nextProps.isLoading &&
        prevProps.video.user.isFollowing === nextProps.video.user.isFollowing
    );
});

const styles = StyleSheet.create({
    itemContainer: {
        width: SCREEN_WIDTH,
        position: 'relative',
    },
    touchArea: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBackground: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    retryText: {
        color: 'white',
        fontWeight: '600',
    },
    retryCountText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        marginTop: 8,
    },
});
