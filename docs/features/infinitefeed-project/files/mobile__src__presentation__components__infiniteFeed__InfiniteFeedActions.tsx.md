# mobile/src/presentation/components/infiniteFeed/InfiniteFeedActions.tsx

Aksiyon butonlari (like/save/share/shop) ve pool ile ayni animasyon davranislari.

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    Easing,
    interpolate,
    Extrapolate,
    SharedValue,
} from 'react-native-reanimated';
import { Heart, Send, Bookmark, PictureInPicture } from 'lucide-react-native';
import { formatCount } from '../../../core/utils';
import { ThemeColors } from './types';

const ACTION_ICON_SIZE = 28;

const HEARTBEAT_DURATION = 80;
const BURST_DURATION = 600;
const BURST_SIZE = 64;
const PARTICLE_COUNT = 12;
const PARTICLE_DISTANCE = 32;
const PARTICLE_SIZE = 4;
const LIKE_PARTICLE_COLORS = ['#FF2146', '#FF3B30', '#FF6B6B', '#FF8A80'];
const SAVE_PARTICLE_COLORS = ['#FFD700', '#FFC107', '#FFB300', '#FFE082'];
const WHITE = '#FFFFFF';

interface ActionButtonProps {
    icon: typeof Heart;
    count: number;
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
    shopsCount: number;
    isLiked: boolean;
    isSaved: boolean;
    showShop: boolean;
    onLike: () => void;
    onSave: () => void;
    onShare: () => void;
    onShop: () => void;
}

function BurstParticle({ angle, color, burst }: { angle: number; color: string; burst: SharedValue<number> }) {
    const animatedStyle = useAnimatedStyle(() => {
        const progress = burst.value;
        const distance = interpolate(progress, [0, 1], [0, PARTICLE_DISTANCE], Extrapolate.CLAMP);
        const opacity = interpolate(progress, [0, 0.2, 1], [0, 1, 0], Extrapolate.CLAMP);
        const scale = interpolate(progress, [0, 0.2, 1], [0.5, 1, 0.8], Extrapolate.CLAMP);
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
}

function ActionButton({
    icon: Icon,
    count,
    onPress,
    colors,
    active = false,
    activeColor,
    canToggle = true,
    enableBurst = false,
    burstColors = LIKE_PARTICLE_COLORS,
    onLongPress,
}: ActionButtonProps) {
    const [localActive, setLocalActive] = useState(active);
    const scale = useSharedValue(1);
    const burst = useSharedValue(0);

    useEffect(() => {
        setLocalActive(active);
    }, [active]);

    const triggerBurst = useCallback(() => {
        if (!enableBurst) return;
        burst.value = 0;
        burst.value = withTiming(1, { duration: BURST_DURATION, easing: Easing.out(Easing.ease) });
    }, [enableBurst, burst]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = () => {
        const nextActive = canToggle ? !localActive : localActive;
        if (canToggle) {
            setLocalActive(nextActive);
        }

        scale.value = withSequence(
            withTiming(1.3, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) }),
            withTiming(0.9, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.15, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) })
        );

        if (nextActive) {
            triggerBurst();
        }
        onPress?.();
    };

    const iconColor = localActive && activeColor ? activeColor : WHITE;
    const iconFill = localActive && activeColor ? activeColor : 'none';
    const strokeWidth = localActive ? 2 : 1.2;
    return (
        <Pressable
            onPress={handlePress}
            onLongPress={onLongPress}
            style={styles.actionButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <Animated.View style={[styles.iconWrapper, animatedStyle]}>
                {enableBurst && (
                    <View style={styles.particles}>
                        {Array.from({ length: PARTICLE_COUNT }).map((_, index) => {
                            const angle = (Math.PI * 2 * Math.random());
                            const color = burstColors[index % burstColors.length];
                            return (
                                <BurstParticle
                                    key={index}
                                    angle={angle}
                                    color={color}
                                    burst={burst}
                                />
                            );
                        })}
                    </View>
                )}
                <Icon
                    size={ACTION_ICON_SIZE}
                    color={iconColor}
                    fill={iconFill}
                    strokeWidth={strokeWidth}
                />
            </Animated.View>
            <Text style={[styles.actionCount, { color: colors.white }]}>{formatCount(count)}</Text>
        </Pressable>
    );
}

export function InfiniteFeedActions({
    colors,
    likesCount,
    savesCount,
    sharesCount,
    shopsCount,
    isLiked,
    isSaved,
    showShop,
    onLike,
    onSave,
    onShare,
    onShop,
}: InfiniteFeedActionsProps) {
    const shake = useSharedValue(0);

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
        const rotation = interpolate(shake.value, [-4, 4], [-1, 1], Extrapolate.CLAMP);
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
            {showShop ? (
                <ActionButton
                    icon={PictureInPicture}
                    count={shopsCount}
                    colors={colors}
                    onPress={onShop}
                    onLongPress={triggerShake}
                    canToggle={false}
                />
            ) : null}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 14,
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 18,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
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
        fontSize: 15,
        fontWeight: '600',
    },
});

```
