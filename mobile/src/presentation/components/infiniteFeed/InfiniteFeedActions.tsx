import React, { startTransition, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    Easing,
    interpolate,
    Extrapolation,
    SharedValue,
} from 'react-native-reanimated';
import { Heart, Send, Bookmark, PictureInPicture } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { formatCount } from '../../../core/utils';
import { ThemeColors } from './InfiniteFeedTypes';
import { FEED_FLAGS } from './hooks/useInfiniteFeedConfig';

const ACTION_ICON_SIZE = 28;

const HEARTBEAT_DURATION = 80;
const BURST_DURATION = 600;
const BURST_SIZE = 64;
const PARTICLE_COUNT = 12;
const PARTICLE_DISTANCE = 32;
const PARTICLE_SIZE = 4;
const LIKE_PARTICLE_COLORS = ['#FF2146', '#FF3B30', '#FF6B6B', '#FF8A80'];
const SAVE_PARTICLE_COLORS = ['#FFD700', '#FFC107', '#FFB300', '#FFE082'];

// ✅ Pre-calculate particle angles to avoid Math.random() in render
const PARTICLE_ANGLES = Array.from({ length: PARTICLE_COUNT }).map((_, i) => (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() * 0.5));

interface ActionButtonProps {
    icon: typeof Heart;
    count: number;
    zeroText?: string;
    onPress?: () => void;
    colors: ThemeColors;
    active?: boolean;
    activeColor?: string;
    canToggle?: boolean;
    enableBurst?: boolean;
    burstColors?: string[];
    onLongPress?: () => void;
}

interface InfiniteFeedActionsProps {
    colors: ThemeColors;
    likesCount: number;
    savesCount: number;
    sharesCount: number;
    isLiked: boolean;
    isSaved: boolean;
    showCommercialTag: boolean;
    showShopIcon: boolean;
    shopTagText?: string;
    onLike: () => void;
    onSave: () => void;
    onShare: () => void;
    onShop: () => void;
}

// ✅ [PERF] Memoized BurstParticle
const BurstParticle = React.memo(function BurstParticle({ angle, color, burst }: { angle: number; color: string; burst: SharedValue<number> }) {
    const animatedStyle = useAnimatedStyle(() => {
        const progress = burst.value;
        const distance = interpolate(progress, [0, 1], [0, PARTICLE_DISTANCE], Extrapolation.CLAMP);
        const opacity = interpolate(progress, [0, 0.2, 1], [0, 1, 0], Extrapolation.CLAMP);
        const scale = interpolate(progress, [0, 0.2, 1], [0.5, 1, 0.8], Extrapolation.CLAMP);
        return {
            opacity,
            transform: [
                { translateX: Math.cos(angle) * distance },
                { translateY: Math.sin(angle) * distance },
                { scale },
            ],
        };
    });

    return <Animated.View style={[styles.particle, { backgroundColor: color }, animatedStyle]} />;
});

// ✅ [PERF] Memoized ActionButton
const ActionButton = React.memo(function ActionButton({
    icon: Icon,
    count,
    zeroText,
    onPress,
    colors,
    active = false,
    activeColor,
    canToggle = true,
    enableBurst = false,
    burstColors = LIKE_PARTICLE_COLORS,
    onLongPress,
}: ActionButtonProps) {
    const activeRef = useRef(active);
    const scale = useSharedValue(1);
    const activeProgress = useSharedValue(active ? 1 : 0);
    const burst = useSharedValue(0);

    useEffect(() => {
        activeRef.current = active;
        activeProgress.value = withTiming(active ? 1 : 0, {
            duration: active ? 90 : 120,
            easing: Easing.out(Easing.ease),
        });
    }, [active, activeProgress]);

    const triggerBurst = useCallback(() => {
        if (!enableBurst) return;
        burst.value = 0;
        burst.value = withTiming(1, { duration: BURST_DURATION, easing: Easing.out(Easing.ease) });
    }, [burst, enableBurst]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));
    const inactiveIconStyle = useAnimatedStyle(() => ({
        opacity: canToggle ? 1 - activeProgress.value : 1,
    }));
    const activeIconStyle = useAnimatedStyle(() => ({
        opacity: activeProgress.value,
        transform: [
            {
                scale: interpolate(activeProgress.value, [0, 1], [0.92, 1], Extrapolation.CLAMP),
            },
        ],
    }));

    const handlePressIn = useCallback(() => {
        // Immediate tactile and visual response on the UI thread
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!FEED_FLAGS.INF_DISABLE_ACTION_ANIMATIONS) {
            scale.value = withTiming(0.85, { duration: 60, easing: Easing.out(Easing.ease) });
        }
    }, [scale]);

    const handlePressOut = useCallback(() => {
        if (!FEED_FLAGS.INF_DISABLE_ACTION_ANIMATIONS) {
            scale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.back(2)) });
        }
    }, [scale]);

    const handlePress = useCallback(() => {
        const nextActive = canToggle ? !activeRef.current : activeRef.current;
        if (canToggle) {
            activeRef.current = nextActive;
            activeProgress.value = withTiming(nextActive ? 1 : 0, {
                duration: 90,
                easing: Easing.out(Easing.ease),
            });
        }

        // ✅ Animations controlled by INF_DISABLE_ACTION_ANIMATIONS flag
        if (!FEED_FLAGS.INF_DISABLE_ACTION_ANIMATIONS) {
            scale.value = withSequence(
                withTiming(1.3, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) }),
                withTiming(0.9, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
                withTiming(1.15, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) })
            );

            if (nextActive) {
                triggerBurst();
            }
        }
        if (!onPress) return;
        if (FEED_FLAGS.INF_DISABLE_ACTION_ANIMATIONS) {
            onPress();
            return;
        }

        startTransition(() => {
            onPress();
        });
    }, [activeProgress, canToggle, onPress, scale, triggerBurst]);

    const formattedCount = useMemo(() => formatCount(count), [count]);
    const isZeroCount = formattedCount === '0';
    const shouldShowCount = !isZeroCount || Boolean(zeroText);

    const countStyle = useMemo(() => [
        styles.actionCount,
        { color: colors.textPrimary }
    ], [colors.textPrimary]);
    const zeroTextStyle = useMemo(() => [
        styles.zeroText,
        { color: colors.textPrimary }
    ], [colors.textPrimary]);

    return (
        <Pressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onLongPress={onLongPress}
            style={[styles.actionButton, isZeroCount && zeroText ? styles.actionButtonZeroState : null]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
            <Animated.View
                style={[styles.iconWrapper, animatedStyle]}
                renderToHardwareTextureAndroid
                shouldRasterizeIOS
            >
                {enableBurst && !FEED_FLAGS.INF_DISABLE_ACTION_ANIMATIONS && (
                    <View
                        style={styles.particles}
                        pointerEvents="none"
                        renderToHardwareTextureAndroid
                        shouldRasterizeIOS
                    >
                        {PARTICLE_ANGLES.map((angle, index) => (
                            <BurstParticle
                                key={index}
                                angle={angle}
                                color={burstColors[index % burstColors.length]}
                                burst={burst}
                            />
                        ))}
                    </View>
                )}
                {canToggle ? (
                    <>
                        <Animated.View style={[styles.iconLayer, inactiveIconStyle]} pointerEvents="none">
                            <Icon
                                size={ACTION_ICON_SIZE}
                                color={colors.textPrimary}
                                fill="none"
                                strokeWidth={1.2}
                            />
                        </Animated.View>
                        <Animated.View style={[styles.iconLayer, styles.iconOverlay, activeIconStyle]} pointerEvents="none">
                            <Icon
                                size={ACTION_ICON_SIZE}
                                color={activeColor || colors.textPrimary}
                                fill={activeColor || colors.textPrimary}
                                strokeWidth={2}
                            />
                        </Animated.View>
                    </>
                ) : (
                    <View style={styles.iconLayer} pointerEvents="none">
                        <Icon
                            size={ACTION_ICON_SIZE}
                            color={colors.textPrimary}
                            fill="none"
                            strokeWidth={1.2}
                        />
                    </View>
                )}
            </Animated.View>
            {shouldShowCount ? (
                <View style={[styles.countContainer, isZeroCount && zeroText ? styles.countContainerBelowIcon : null]}>
                    {isZeroCount && zeroText ? (
                        <Text style={zeroTextStyle}>{zeroText}</Text>
                    ) : (
                        <Text style={countStyle}>{formattedCount}</Text>
                    )}
                </View>
            ) : null}
        </Pressable>
    );
}, (prevProps, nextProps) => {
    if (prevProps.icon !== nextProps.icon) return false;
    if (prevProps.count !== nextProps.count) return false;
    if (prevProps.zeroText !== nextProps.zeroText) return false;
    if (prevProps.onPress !== nextProps.onPress) return false;
    if (prevProps.onLongPress !== nextProps.onLongPress) return false;
    if (prevProps.colors.textPrimary !== nextProps.colors.textPrimary) return false;
    if (prevProps.active !== nextProps.active) return false;
    if (prevProps.activeColor !== nextProps.activeColor) return false;
    if (prevProps.canToggle !== nextProps.canToggle) return false;
    if (prevProps.enableBurst !== nextProps.enableBurst) return false;
    if (prevProps.burstColors !== nextProps.burstColors) return false;

    return true;
});

// ✅ [PERF] Memoized InfiniteFeedActions
export const InfiniteFeedActions = React.memo(function InfiniteFeedActions({
    colors,
    likesCount,
    savesCount,
    sharesCount,
    isLiked,
    isSaved,
    showCommercialTag,
    showShopIcon,
    shopTagText,
    onLike,
    onSave,
    onShare,
    onShop,
}: InfiniteFeedActionsProps) {
    const shake = useSharedValue(0);
    const isDarkTheme = colors.textPrimary.toLowerCase() === '#ffffff';
    const commercialTagBackgroundColor = isDarkTheme ? '#FFFFFF' : '#080A0F';
    const commercialTagForegroundColor = isDarkTheme ? '#080A0F' : '#FFFFFF';

    const triggerShake = useCallback(() => {
        shake.value = withSequence(
            withTiming(-4, { duration: 50, easing: Easing.out(Easing.quad) }),
            withTiming(4, { duration: 50, easing: Easing.out(Easing.quad) }),
            withTiming(-3, { duration: 50, easing: Easing.out(Easing.quad) }),
            withTiming(3, { duration: 50, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 60, easing: Easing.out(Easing.quad) })
        );
    }, [shake]);

    const shakeStyle = useAnimatedStyle(() => {
        const rotation = interpolate(shake.value, [-4, 4], [-1, 1], Extrapolation.CLAMP);
        return {
            transform: [{ translateX: shake.value }, { rotateZ: `${rotation}deg` }],
        };
    });

    return (
        <Animated.View style={[styles.actionsRow, shakeStyle]}>
            <View style={styles.leftActions}>
                <ActionButton
                    icon={Heart}
                    count={likesCount}
                    colors={colors}
                    active={isLiked}
                    activeColor="#FF2146"
                    onPress={onLike}
                    onLongPress={triggerShake}
                    enableBurst={true}
                    burstColors={LIKE_PARTICLE_COLORS}
                />
                <ActionButton
                    icon={Bookmark}
                    count={savesCount}
                    colors={colors}
                    active={isSaved}
                    activeColor="#FFD700"
                    onPress={onSave}
                    onLongPress={triggerShake}
                    enableBurst={true}
                    burstColors={SAVE_PARTICLE_COLORS}
                />
                <ActionButton
                    icon={Send}
                    count={sharesCount}
                    colors={colors}
                    onPress={onShare}
                    onLongPress={triggerShake}
                    canToggle={false}
                />
            </View>
            {showCommercialTag ? (
                <View style={[styles.commercialShopTag, { backgroundColor: commercialTagBackgroundColor }]}>
                    <Pressable
                        style={styles.commercialMainAction}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onShop();
                        }}
                        onLongPress={triggerShake}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        {showShopIcon ? (
                            <PictureInPicture size={14} color={commercialTagForegroundColor} strokeWidth={1.8} />
                        ) : null}
                        <Text style={[styles.commercialShopText, { color: commercialTagForegroundColor }]} numberOfLines={1}>
                            {shopTagText || 'İş Birliği'}
                        </Text>
                    </Pressable>
                </View>
            ) : null}
        </Animated.View>
    );
}, (prevProps, nextProps) => {
    if (prevProps.colors.textPrimary !== nextProps.colors.textPrimary) return false;
    if (prevProps.likesCount !== nextProps.likesCount) return false;
    if (prevProps.savesCount !== nextProps.savesCount) return false;
    if (prevProps.sharesCount !== nextProps.sharesCount) return false;
    if (prevProps.isLiked !== nextProps.isLiked) return false;
    if (prevProps.isSaved !== nextProps.isSaved) return false;
    if (prevProps.showCommercialTag !== nextProps.showCommercialTag) return false;
    if (prevProps.showShopIcon !== nextProps.showShopIcon) return false;
    if (prevProps.shopTagText !== nextProps.shopTagText) return false;
    if (prevProps.onLike !== nextProps.onLike) return false;
    if (prevProps.onSave !== nextProps.onSave) return false;
    if (prevProps.onShare !== nextProps.onShare) return false;
    if (prevProps.onShop !== nextProps.onShop) return false;

    return true;
});

const styles = StyleSheet.create({
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginTop: 14,
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        minHeight: ACTION_ICON_SIZE,
        position: 'relative',
    },
    actionButtonZeroState: {
        minHeight: ACTION_ICON_SIZE + 18,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
    },
    iconWrapper: {
        width: ACTION_ICON_SIZE,
        height: ACTION_ICON_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    iconLayer: {
        width: ACTION_ICON_SIZE,
        height: ACTION_ICON_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    particles: {
        position: 'absolute',
        width: BURST_SIZE,
        height: BURST_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    particle: {
        position: 'absolute',
        width: PARTICLE_SIZE,
        height: PARTICLE_SIZE,
        borderRadius: PARTICLE_SIZE / 2,
    },
    actionCount: {
        fontSize: 14,
        fontWeight: '500',
    },
    countContainer: {
        minHeight: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    countContainerBelowIcon: {
        position: 'absolute',
        top: ACTION_ICON_SIZE + 2,
        left: 0,
        width: ACTION_ICON_SIZE,
    },
    zeroText: {
        fontSize: 11,
        fontWeight: '400',
    },
    commercialShopTag: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 10,
        minHeight: 30,
        borderRadius: 16,
        maxWidth: '66%',
    },
    commercialMainAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flexShrink: 1,
    },
    commercialShopText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
        flexShrink: 1,
    },
    commercialInfoButton: {
        marginLeft: 8,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
