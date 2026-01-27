/**
 * ActiveVideoOverlay - Decoupled UI Layer for Feed
 *
 * This component renders UI overlays for the active video, completely
 * separate from the video player layer. This architecture provides:
 *
 * 1. Zero coupling: UI re-renders don't affect video playback
 * 2. 0ms sync: Both layers read from the same Zustand store
 * 3. YouTube-level performance: Video texture runs on native thread
 *
 * NOTE: Gesture detection (tap, double-tap, long-press) is handled by
 * ScrollPlaceholder in FeedManager to allow FlashList scrolling.
 *
 * Layer Structure:
 * - Status Icons (Play/Pause/Replay)
 * - Action Buttons (Like, Save, Share, Shop)
 * - Metadata Layer (Username, Description, Follow)
 * - Video SeekBar
 * - Error/Loading overlays
 */

import React, { memo, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    withTiming,
    SharedValue,
    useSharedValue,
    withDelay,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pause, Repeat1, RefreshCcw, AlertCircle } from 'lucide-react-native';

import { Video } from '../../../domain/entities/Video';
import { ActionButtons, ActionButtonsRef } from './ActionButtons';
import { MetadataLayer } from './MetadataLayer';
import { VideoSeekBar } from './VideoSeekBar';
import PlayIcon from '../../../../assets/icons/play.svg';
import type { VideoPlayerPoolRef } from './VideoPlayerPool';

const MAX_RETRIES = 3;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// ============================================================================
// Types
// ============================================================================

interface ActiveVideoOverlayData {
    video: Video;
    currentUserId?: string;
    activeIndex: number;
}

interface ActiveVideoOverlayPlayback {
    isFinished: boolean;
    hasError: boolean;
    retryCount: number;
    isCleanScreen: boolean;
    isSeeking: boolean;
    tapIndicator: 'play' | 'pause' | null;
    rateLabel: string | null;
}

interface ActiveVideoOverlayTimeline {
    currentTimeSV: SharedValue<number>;
    durationSV: SharedValue<number>;
    isScrollingSV: SharedValue<boolean>;
    scrollY: SharedValue<number>;
}

interface ActiveVideoOverlayActions {
    onToggleLike: () => void;
    onToggleSave: () => void;
    onToggleShare: () => void;
    onToggleFollow: () => void;
    onOpenShopping: () => void;
    onOpenDescription: () => void;
    playbackController: Pick<VideoPlayerPoolRef, 'seekTo' | 'retryActive'>;
    onActionPressIn?: () => void;
    onActionPressOut?: () => void;
}

interface ActiveVideoOverlayProps {
    data: ActiveVideoOverlayData;
    playback: ActiveVideoOverlayPlayback;
    timeline: ActiveVideoOverlayTimeline;
    actions: ActiveVideoOverlayActions;
}

// ============================================================================
// Component
// ============================================================================

export const ActiveVideoOverlay = memo(function ActiveVideoOverlay({
    data,
    playback,
    timeline,
    actions,
}: ActiveVideoOverlayProps) {
    const { video, currentUserId, activeIndex } = data;
    const {
        isFinished,
        hasError,
        retryCount,
        isCleanScreen,
        isSeeking,
        tapIndicator,
        rateLabel,
    } = playback;
    const { currentTimeSV, durationSV, isScrollingSV, scrollY } = timeline;
    const {
        onToggleLike,
        onToggleSave,
        onToggleShare,
        onToggleFollow,
        onOpenShopping,
        onOpenDescription,
        playbackController,
        onActionPressIn,
        onActionPressOut,
    } = actions;
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const actionButtonsRef = useRef<ActionButtonsRef>(null);

    // Native Thread Delay Logic
    // 0 = Hidden, 1 = Visible
    // Controlled purely by Reanimated to avoid JS thread jitter
    const uiVisibleSV = useSharedValue(0);

    useEffect(() => {
        // Immediate hide
        uiVisibleSV.value = 0;
        
        // Native delay: Wait 50ms, then fade in over 50ms
        // Ultra-snappier transition
        uiVisibleSV.value = withDelay(50, withTiming(1, { duration: 50 }));
    }, [video.id]);

    // ========================================================================
    // Derived state
    // ========================================================================

    const isSelfProfile = !!currentUserId && video.user.id === currentUserId;
    const profileRoute = isSelfProfile ? '/profile' : `/user/${video.user.id}`;

    const showUiOverlays = !isCleanScreen;
    const showTapIndicator = !!tapIndicator && !hasError;
    const showReplayIcon = isFinished && !hasError && !showTapIndicator;
    const showPlayPauseIcon = showTapIndicator || showReplayIcon;

    // ========================================================================
    // Animated styles
    // ========================================================================

    // Transform to follow video position (sync with VideoPlayerPool)
    const transformStyle = useAnimatedStyle(() => {
        const targetY = activeIndex * SCREEN_HEIGHT;
        return {
            transform: [{ translateY: targetY - scrollY.value }]
        };
    }, [activeIndex, scrollY]);

    const uiOpacityStyle = useAnimatedStyle(() => ({
        opacity: withTiming(isSeeking ? 0 : 1, { duration: 200 }),
    }), [isSeeking]);

    // Optimize scroll performance & entry animation
    // 1. Hides instantly when scrolling
    // 2. Fades in smoothly after delay when video changes
    const contentOpacityStyle = useAnimatedStyle(() => {
        const isScrolling = isScrollingSV.value;
        const visibility = uiVisibleSV.value;
        
        // If scrolling, force hide (0). Otherwise use the visibility animation value.
        return {
            opacity: isScrolling ? 0.3 : visibility
        };
    }, []);

    // ========================================================================
    // Handlers
    // ========================================================================

    const handleLikePress = useCallback(() => {
        if (!video.isLiked) {
            actionButtonsRef.current?.animateLike();
        }
        onToggleLike();
    }, [video.isLiked, onToggleLike]);

    const handleProfilePress = useCallback(() => {
        router.push(profileRoute as any);
    }, [router, profileRoute]);

    // Expose animateLike for external double-tap trigger
    const triggerLikeAnimation = useCallback(() => {
        actionButtonsRef.current?.animateLike();
    }, []);

    // ========================================================================
    // Render
    // ========================================================================

    return (
        <Animated.View
            style={[
                styles.container,
                transformStyle
            ]}
            pointerEvents="box-none"
        >
            {/* ================================================================
                Layer 1: Status Overlays (Center icons, loading, error)
                ================================================================ */}
            <View style={styles.centerOverlay} pointerEvents="box-none">
                {/* Rate Badge */}
                {rateLabel && (
                    <View style={styles.rateBadge} pointerEvents="none">
                        <Text style={styles.rateText}>{rateLabel}</Text>
                    </View>
                )}

                {/* Play/Pause/Replay Icons */}
                {showUiOverlays && showPlayPauseIcon && (
                    <View style={styles.iconContainer} pointerEvents="none">
                        <View style={styles.iconBackground}>
                            {showReplayIcon ? (
                                <Repeat1 size={44} color="#FFFFFF" strokeWidth={1.2} />
                            ) : tapIndicator === 'pause' ? (
                                <Pause size={44} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
                            ) : (
                                <PlayIcon width={44} height={44} color="#FFFFFF" style={{ marginLeft: 5 }} />
                            )}
                        </View>
                    </View>
                )}

                {/* Loading Indicator - Removed */}

                {/* Error Overlay */}
                {hasError && (
                    <View style={[styles.errorOverlay]}>
                        <View style={styles.errorContainer}>
                            <AlertCircle color="#EF4444" size={48} style={{ marginBottom: 12 }} />
                            <Text style={styles.errorText}>Video oynatılamadı</Text>
                            <Pressable style={styles.retryButton} onPress={playbackController.retryActive}>
                                <RefreshCcw color="#FFF" size={20} />
                                <Text style={styles.retryText}>Tekrar Dene</Text>
                            </Pressable>
                            {retryCount > 0 && (
                                <Text style={styles.retryCountText}>
                                    Deneme {retryCount}/{MAX_RETRIES}
                                </Text>
                            )}
                        </View>
                    </View>
                )}
            </View>

            {/* ================================================================
                Layer 2: UI Controls (ActionButtons, Metadata, SeekBar)
                ================================================================ */}
            {showUiOverlays && (
                <Animated.View
                    style={[
                        styles.uiLayer,
                        {
                            top: insets.top,
                            bottom: 0, // Tab navigator handles bottom safe area
                        },
                        uiOpacityStyle
                    ]}
                    pointerEvents={isSeeking ? 'none' : 'box-none'}
                >
                    {/* UI Content - Fades out during scroll for performance */}
                    <Animated.View style={[StyleSheet.absoluteFill, contentOpacityStyle]} pointerEvents="box-none">
                        {/* Action Buttons (Right side) */}
                        <ActionButtons
                            ref={actionButtonsRef}
                            state={{
                                isLiked: video.isLiked,
                                likesCount: video.likesCount,
                                isSaved: video.isSaved,
                                savesCount: video.savesCount || 0,
                                sharesCount: video.sharesCount,
                                shopsCount: video.shopsCount || 0,
                                showShop: !!video.brandUrl,
                            }}
                            handlers={{
                                onLike: handleLikePress,
                                onSave: onToggleSave,
                                onShare: onToggleShare,
                                onShop: onOpenShopping,
                                onPressIn: onActionPressIn,
                                onPressOut: onActionPressOut,
                            }}
                        />

                        {/* Metadata Layer (Bottom left) */}
                        <MetadataLayer
                            data={{ video, currentUserId }}
                            handlers={{
                                onAvatarPress: handleProfilePress,
                                onFollowPress: onToggleFollow,
                                onReadMorePress: onOpenDescription,
                                onCommercialTagPress: () => {},
                            }}
                        />
                    </Animated.View>

                    {/* Video SeekBar (Bottom) */}
                    <VideoSeekBar
                        currentTime={currentTimeSV}
                        duration={durationSV}
                        isScrolling={isScrollingSV}
                        onSeek={playbackController.seekTo}
                        isActive={true}
                        spriteUrl={video.spriteUrl}
                    />
                </Animated.View>
            )}
        </Animated.View>
    );
}, (prevProps, nextProps) => {
    // Custom equality check for optimal re-renders
    return (
        prevProps.data.video.id === nextProps.data.video.id &&
        prevProps.data.activeIndex === nextProps.data.activeIndex &&
        prevProps.data.video.isLiked === nextProps.data.video.isLiked &&
        prevProps.data.video.isSaved === nextProps.data.video.isSaved &&
        prevProps.data.video.likesCount === nextProps.data.video.likesCount &&
        prevProps.data.video.savesCount === nextProps.data.video.savesCount &&
        prevProps.data.video.sharesCount === nextProps.data.video.sharesCount &&
        prevProps.data.video.shopsCount === nextProps.data.video.shopsCount &&
        prevProps.data.video.commentsCount === nextProps.data.video.commentsCount &&
        prevProps.data.video.description === nextProps.data.video.description &&
        prevProps.data.video.brandUrl === nextProps.data.video.brandUrl &&
        prevProps.data.video.brandName === nextProps.data.video.brandName &&
        prevProps.data.video.user.username === nextProps.data.video.user.username &&
        prevProps.data.video.user.fullName === nextProps.data.video.user.fullName &&
        prevProps.data.video.user.avatarUrl === nextProps.data.video.user.avatarUrl &&
        prevProps.data.video.user.isFollowing === nextProps.data.video.user.isFollowing &&
        prevProps.playback.isFinished === nextProps.playback.isFinished &&
        prevProps.playback.hasError === nextProps.playback.hasError &&
        prevProps.playback.isCleanScreen === nextProps.playback.isCleanScreen &&
        prevProps.playback.isSeeking === nextProps.playback.isSeeking &&
        prevProps.playback.tapIndicator === nextProps.playback.tapIndicator &&
        prevProps.playback.rateLabel === nextProps.playback.rateLabel &&
        prevProps.playback.retryCount === nextProps.playback.retryCount
    );
});

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        width: '100%',
        height: SCREEN_HEIGHT,
        zIndex: 50,
    },
    centerOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'box-none',
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBackground: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rateBadge: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -24 }, { translateY: -60 }],
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 12,
    },
    rateText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '600',
    },
    errorOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    retryCountText: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 12,
    },
    uiLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 60,
    },
});
