import React, { memo, useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    withRepeat,
    Easing,
    interpolate,
    Extrapolate,
    SharedValue,
} from 'react-native-reanimated';
import { Heart, Bookmark, Send, PictureInPicture } from 'lucide-react-native';

interface ActionButtonsProps {
    isLiked: boolean;
    likesCount: number;
    isSaved: boolean;
    savesCount: number;
    sharesCount: number;
    shopsCount: number;
    videoId: string;
    onLike: () => void;
    onSave: () => void;
    onShare: () => void;
    onShop: () => void;
    onProfilePress: () => void;
    showShop?: boolean;
    onPressIn?: () => void;
    onPressOut?: () => void;
}

export interface ActionButtonsRef {
    animateLike: () => void;
}

const ICON_SIZE = 38;
const ACTION_BUTTON_GAP = 14;

const LIKE_COLOR = '#FF2146';
const SAVE_COLOR = '#FFD700';
const WHITE = '#FFFFFF';

const HEARTBEAT_DURATION = 80;
const BURST_DURATION = 600;
const BURST_SIZE = 64;
const PARTICLE_COUNT = 12;
const PARTICLE_DISTANCE = 32;
const PARTICLE_SIZE = 4;
const LIKE_PARTICLE_COLORS = ['#FF2146', '#FF3B30', '#FF6B6B', '#FF8A80'];
const SAVE_PARTICLE_COLORS = ['#FFD700', '#FFC107', '#FFB300', '#FFE082'];


interface ActionButtonProps {
    onPress: () => void;
    onLongPress?: () => void;
    onPressIn?: () => void;
    onPressOut?: () => void;
    IconComponent: typeof Heart;
    count: string;
    zeroText: string;
    videoId: string;
    isActive: boolean;
    activeColor: string;
    canToggle?: boolean; // If false, no color change on press
    enableBurst?: boolean;
    burstColors?: string[];
}

interface ActionButtonRef {
    animate: () => void;
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

const ActionButton = forwardRef<ActionButtonRef, ActionButtonProps>(
    ({ onPress, onLongPress, onPressIn, onPressOut, IconComponent, count, zeroText, videoId, isActive, activeColor, canToggle = true, enableBurst = false, burstColors = LIKE_PARTICLE_COLORS }, ref) => {
        const [localActive, setLocalActive] = useState(isActive);
        const scale = useSharedValue(1);
        const isZero = count === '0';
        const burst = useSharedValue(0);

        useEffect(() => {
            setLocalActive(isActive);
        }, [isActive]);

        const triggerBurst = useCallback(() => {
            if (!enableBurst) return;
            burst.value = 0;
            burst.value = withTiming(1, { duration: BURST_DURATION, easing: Easing.out(Easing.ease) });
        }, [enableBurst, burst]);

        useImperativeHandle(ref, () => ({
            animate: () => {
                setLocalActive(true);
                triggerBurst();
                scale.value = withSequence(
                    withTiming(1.3, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) }),
                    withTiming(0.9, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1.15, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) })
                );
            },
        }));

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
            onPress();
        };

        const iconColor = localActive ? activeColor : WHITE;
        const iconFill = localActive ? activeColor : 'none';
        return (
            <Pressable
                onPress={handlePress}
                onLongPress={onLongPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                delayLongPress={200}
                style={styles.buttonContainer}
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
                    <IconComponent
                        size={ICON_SIZE}
                        color={iconColor}
                        fill={iconFill}
                        strokeWidth={localActive ? 2 : 1.2}
                    />
                </Animated.View>
                {isZero ? (
                    <View style={styles.countContainer}>
                        <Text style={styles.zeroText}>{zeroText}</Text>
                    </View>
                ) : (
                    <View style={styles.countContainer}>
                        <Text style={styles.count}>{count}</Text>
                    </View>
                )}
            </Pressable>
        );
    }
);

export const ActionButtons = memo(forwardRef<ActionButtonsRef, ActionButtonsProps>(function ActionButtons({
    isLiked,
    likesCount,
    isSaved,
    savesCount,
    sharesCount,
    shopsCount,
    videoId,
    onLike,
    onSave,
    onShare,
    onShop,
    showShop = true,
    onPressIn,
    onPressOut,
}, ref) {
    const likeButtonRef = useRef<ActionButtonRef>(null);
    const shake = useSharedValue(0);

    useImperativeHandle(ref, () => ({
        animateLike: () => {
            likeButtonRef.current?.animate();
        },
    }));

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
        <View style={styles.container} pointerEvents="box-none">
            <Animated.View style={[styles.actionsStack, shakeStyle]}>
                <ActionButton
                    ref={likeButtonRef}
                    IconComponent={Heart}
                    count={formatCount(likesCount)}
                    zeroText="Beğen"
                    videoId={videoId}
                    onPress={onLike}
                    onLongPress={triggerShake}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    isActive={isLiked}
                    activeColor={LIKE_COLOR}
                    enableBurst={true}
                    burstColors={LIKE_PARTICLE_COLORS}
                />

                <ActionButton
                    IconComponent={Bookmark}
                    count={formatCount(savesCount || 0)}
                    zeroText="Kaydet"
                    videoId={videoId}
                    onPress={onSave}
                    onLongPress={triggerShake}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    isActive={isSaved}
                    activeColor={SAVE_COLOR}
                    enableBurst={true}
                    burstColors={SAVE_PARTICLE_COLORS}
                />

                <ActionButton
                    IconComponent={Send}
                    count={formatCount(sharesCount)}
                    zeroText="Gönder"
                    videoId={videoId}
                    onPress={onShare}
                    onLongPress={triggerShake}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    isActive={false}
                    activeColor={WHITE}
                    canToggle={false}
                />

                {showShop ? (
                    <ActionButton
                        IconComponent={PictureInPicture}
                        count={formatCount(shopsCount || 0)}
                        zeroText="Göz At"
                        videoId={videoId}
                        onPress={onShop}
                        onLongPress={triggerShake}
                        onPressIn={onPressIn}
                        onPressOut={onPressOut}
                        isActive={false}
                        activeColor={WHITE}
                        canToggle={false}
                    />
                ) : null}
            </Animated.View>
        </View>
    );
}));

function formatCount(count: number): string {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    let countNum = Number(count);
    return isNaN(countNum) ? '0' : countNum.toString();
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 18,
        top: 150,
        bottom: -150,
        flexDirection: 'column',
        gap: 14,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
    },
    actionsStack: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
    },
    buttonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        position: 'relative',
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
    countContainer: {
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    count: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        textAlign: 'center',
    },
    zeroText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '400',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        textAlign: 'center',
    },
});
