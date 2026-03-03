/**
 * PoolFeedActiveVideoOverlay - Decoupled UI Layer for Feed
 *
 * This component renders UI overlays for the active video, completely
 * separate from the video player layer. This architecture provides:
 *
 * 1. Zero coupling: UI re-renders don't affect video playback
 * 2. 0ms sync: Both layers read from the same Zustand store
 * 3. YouTube-level performance: Video texture runs on native thread
 *
 * NOTE: Gesture detection (tap, double-tap, long-press) is handled by
 * PoolFeedScrollPlaceholder in FeedManager to allow FlashList scrolling.
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
    type LayoutChangeEvent,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    SharedValue,
    useSharedValue,
    useAnimatedReaction,
    runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pause, RefreshCcw, AlertCircle } from 'lucide-react-native';
import { isDisabled } from './hooks/usePoolFeedConfig';
import { useSubtitles } from '../../hooks/useSubtitles';
import { useSubtitlePreferencesStore } from '../../store/useSubtitlePreferencesStore';
import {
    applySubtitleTextCase,
    SUBTITLE_BORDER_RADIUS,
    SUBTITLE_SIDE_MARGIN,
    SUBTITLE_TEXT_BASE_STYLE,
    getSubtitlePresentationPixelStyle,
    getSubtitleWrapperStyle,
    resolveSubtitleStyle,
} from '../../../core/utils/subtitleOverlay';

import { Video } from '../../../domain/entities/Video';
import { PoolFeedActionButtons, PoolFeedActionButtonsRef } from './PoolFeedActionButtons';
import { PoolFeedMetadataLayer } from './PoolFeedMetadataLayer';
import { PoolFeedVideoSeekBar } from './PoolFeedVideoSeekBar';
import PlayIcon from '@assets/icons/media/play.svg';
import type { PoolFeedVideoPlayerPoolRef } from './PoolFeedVideoPlayerPool';

const MAX_RETRIES = 3;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SUBTITLE_MAX_WIDTH = SCREEN_WIDTH - (SUBTITLE_SIDE_MARGIN * 2);
const SUBTITLE_BOTTOM_SAFE_PADDING = 60;

// ============================================================================
// Types
// ============================================================================

interface ActiveVideoOverlayData {
    video: Video;
    currentUserId?: string;
    hasActiveStory?: boolean;
    activeIndex: number;
    isPlayable: boolean;
}

interface ActiveVideoOverlayPlayback {
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
    playbackController: Pick<PoolFeedVideoPlayerPoolRef, 'seekTo' | 'retryActive'>;
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

export const PoolFeedActiveVideoOverlay = memo(function PoolFeedActiveVideoOverlay({
    data,
    playback,
    timeline,
    actions,
}: ActiveVideoOverlayProps) {
    const { video, currentUserId, hasActiveStory, activeIndex, isPlayable } = data;
    const {
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
    const actionButtonsRef = useRef<PoolFeedActionButtonsRef>(null);
    const [activeSubtitleText, setActiveSubtitleText] = React.useState<string | null>(null);
    const [currentTimeSec, setCurrentTimeSec] = React.useState(0);
    const [subtitleLayoutBounds, setSubtitleLayoutBounds] = React.useState({ width: 0, height: 0 });
    const subtitleMode = useSubtitlePreferencesStore((state) => state.mode);

    // Native Thread Delay Logic
    // 0 = Hidden, 1 = Visible
    // Controlled purely by Reanimated to avoid JS thread jitter
    const uiVisibleSV = useSharedValue(0);

    useEffect(() => {
        uiVisibleSV.value = 1;
    }, [video.id]);

    // ========================================================================
    // Derived state
    // ========================================================================

    const isSelfProfile = !!currentUserId && video.user.id === currentUserId;
    const profileRoute = isSelfProfile ? '/profile' : `/user/${video.user.id}`;
    const showUiOverlays = !isCleanScreen;
    const showTapIndicator = !!tapIndicator && !hasError;
    const showSeekBar = isPlayable;
    const shouldShowSubtitlePreference = subtitleMode !== 'off';
    const subtitleBottomOffset = Math.max(170, insets.bottom + 150);
    const { subtitles, getActiveSubtitle } = useSubtitles(shouldShowSubtitlePreference ? video.id : undefined);
    const subtitlePresentationStyle = React.useMemo(() => {
        return getSubtitlePresentationPixelStyle(
            subtitles?.presentation,
            subtitleLayoutBounds.width,
            subtitleLayoutBounds.height,
            {
                bottomPadding: SUBTITLE_BOTTOM_SAFE_PADDING,
                verticalAnchor: 'bottom',
            }
        );
    }, [subtitles?.presentation, subtitleLayoutBounds.width, subtitleLayoutBounds.height]);
    const subtitlePositionStyle = React.useMemo(
        () => subtitlePresentationStyle ?? { bottom: subtitleBottomOffset },
        [subtitleBottomOffset, subtitlePresentationStyle]
    );
    const resolvedSubtitleStyle = React.useMemo(() => resolveSubtitleStyle(subtitles?.style), [subtitles?.style]);
    const formattedSubtitleText = React.useMemo(
        () => applySubtitleTextCase(activeSubtitleText || '', subtitles?.style?.textCase),
        [activeSubtitleText, subtitles?.style?.textCase]
    );
    const subtitleTextDynamicStyle = React.useMemo(() => {
        return {
            fontSize: resolvedSubtitleStyle.fontSize,
            lineHeight: resolvedSubtitleStyle.lineHeight,
            textAlign: resolvedSubtitleStyle.textAlign,
            color: resolvedSubtitleStyle.textColor,
            fontFamily: resolvedSubtitleStyle.fontFamily,
            fontWeight: resolvedSubtitleStyle.fontWeight,
        };
    }, [
        resolvedSubtitleStyle.textColor,
        resolvedSubtitleStyle.fontFamily,
        resolvedSubtitleStyle.fontWeight,
        resolvedSubtitleStyle.fontSize,
        resolvedSubtitleStyle.lineHeight,
        resolvedSubtitleStyle.textAlign,
    ]);
    const subtitleWrapperDynamicStyle = React.useMemo(
        () => getSubtitleWrapperStyle(resolvedSubtitleStyle.showOverlay, resolvedSubtitleStyle.overlayColor),
        [resolvedSubtitleStyle.showOverlay, resolvedSubtitleStyle.overlayColor]
    );

    useAnimatedReaction(
        () => currentTimeSV.value,
        (nextTime, prevTime) => {
            if (nextTime === prevTime) return;
            runOnJS(setCurrentTimeSec)(nextTime);
        },
        [currentTimeSV]
    );

    useEffect(() => {
        if (!shouldShowSubtitlePreference || !showUiOverlays || !isPlayable) {
            if (activeSubtitleText !== null) {
                setActiveSubtitleText(null);
            }
            return;
        }
        const subtitleAtTime = getActiveSubtitle(currentTimeSec * 1000);
        if (subtitleAtTime !== activeSubtitleText) {
            setActiveSubtitleText(subtitleAtTime);
        }
    }, [
        activeSubtitleText,
        currentTimeSec,
        getActiveSubtitle,
        isPlayable,
        shouldShowSubtitlePreference,
        showUiOverlays,
    ]);

    // ========================================================================
    // Animated styles
    // ========================================================================

    // Transform to follow video position (sync with PoolFeedVideoPlayerPool)
    const transformStyle = useAnimatedStyle(() => {
        const targetY = activeIndex * SCREEN_HEIGHT;
        return {
            transform: [{ translateY: targetY - scrollY.value }]
        };
    }, [activeIndex, scrollY]);

    const uiOpacityStyle = useAnimatedStyle(() => ({
        opacity: 1,
    }), []);

    // UI content opacity (keep stable during scroll)
    const contentOpacityStyle = useAnimatedStyle(() => {
        const visibility = uiVisibleSV.value;

        return {
            opacity: visibility
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
    const handleSubtitleContainerLayout = useCallback((event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setSubtitleLayoutBounds((prev) => {
            if (Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5) {
                return prev;
            }
            return { width, height };
        });
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

                {/* Play/Pause Icons */}
                {showUiOverlays && showTapIndicator && (
                    <View style={styles.iconContainer} pointerEvents="box-none">
                        <View style={styles.iconBackground}>
                            {tapIndicator === 'pause' ? (
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
                Layer 2: UI Controls (PoolFeedActionButtons, Metadata, SeekBar)
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
                    onLayout={handleSubtitleContainerLayout}
                >
                    {/* UI Content - Fades out during scroll for performance */}
                    <Animated.View style={[StyleSheet.absoluteFill, contentOpacityStyle]} pointerEvents="box-none">
                        {/* Action Buttons (Right side) */}
                        {!isDisabled('DISABLE_ACTION_BUTTONS') && (
                            <PoolFeedActionButtons
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
                        )}

                        {/* Metadata Layer (Bottom left) */}
                        <PoolFeedMetadataLayer
                            data={{ video, currentUserId, hasActiveStory }}
                            handlers={{
                                onAvatarPress: handleProfilePress,
                                onFollowPress: onToggleFollow,
                                onReadMorePress: onOpenDescription,
                                onCommercialTagPress: () => { },
                            }}
                        />
                        {shouldShowSubtitlePreference && showUiOverlays && activeSubtitleText && (
                            <View
                                style={[styles.subtitleContainer, subtitlePositionStyle]}
                                pointerEvents="none"
                            >
                                <View style={[styles.subtitleWrapper, subtitleWrapperDynamicStyle]}>
                                    <Text style={[styles.subtitleText, subtitleTextDynamicStyle]}>{formattedSubtitleText}</Text>
                                </View>
                            </View>
                        )}
                    </Animated.View>

                    {/* Video SeekBar (Bottom) */}
                    {showSeekBar && !isDisabled('DISABLE_SEEKBAR') && (
                        <PoolFeedVideoSeekBar
                            currentTime={currentTimeSV}
                            duration={durationSV}
                            isScrolling={isScrollingSV}
                            onSeek={playbackController.seekTo}
                            isActive={true}
                            spriteUrl={video.spriteUrl}
                        />
                    )}
                </Animated.View>
            )}
        </Animated.View>
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
    subtitleContainer: {
        position: 'absolute',
        left: SUBTITLE_SIDE_MARGIN,
        maxWidth: SUBTITLE_MAX_WIDTH,
        zIndex: 80,
    },
    subtitleWrapper: {
        borderRadius: SUBTITLE_BORDER_RADIUS,
    },
    subtitleText: {
        ...SUBTITLE_TEXT_BASE_STYLE,
    },
});
