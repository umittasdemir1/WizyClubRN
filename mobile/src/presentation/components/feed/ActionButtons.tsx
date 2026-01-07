import React, { memo, useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    withRepeat,
    Easing,
} from 'react-native-reanimated';
import { Heart, Bookmark, Send, ShoppingBag } from 'lucide-react-native';

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
}

export interface ActionButtonsRef {
    animateLike: () => void;
}

const BASE_BOTTOM_POSITION = 120;
const SAFE_AREA_OFFSET = 100;
const ICON_SIZE = 34;

const LIKE_COLOR = '#FF2146';
const SAVE_COLOR = '#FFD700';
const WHITE = '#FFFFFF';

const HEARTBEAT_DURATION = 80;


interface ActionButtonProps {
    onPress: () => void;
    IconComponent: typeof Heart;
    count: string;
    zeroText: string;
    videoId: string;
    isActive: boolean;
    activeColor: string;
    canToggle?: boolean; // If false, no color change on press
}

interface ActionButtonRef {
    animate: () => void;
}

const ActionButton = forwardRef<ActionButtonRef, ActionButtonProps>(
    ({ onPress, IconComponent, count, zeroText, videoId, isActive, activeColor, canToggle = true }, ref) => {
        const [localActive, setLocalActive] = useState(isActive);
        const scale = useSharedValue(1);
        const isZero = count === '0';

        useEffect(() => {
            setLocalActive(isActive);
        }, [isActive]);

        useImperativeHandle(ref, () => ({
            animate: () => {
                setLocalActive(true);
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
            if (canToggle) {
                setLocalActive(prev => !prev);
            }

            scale.value = withSequence(
                withTiming(1.3, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) }),
                withTiming(0.9, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
                withTiming(1.15, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) })
            );

            onPress();
        };

        const iconColor = localActive ? activeColor : WHITE;
        const iconFill = localActive ? activeColor : 'none';

        return (
            <Pressable
                onPress={handlePress}
                style={styles.buttonContainer}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Animated.View style={[styles.iconWrapper, animatedStyle]}>
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
}, ref) {
    const insets = useSafeAreaInsets();
    const bottom = Math.max(BASE_BOTTOM_POSITION, insets.bottom + SAFE_AREA_OFFSET);
    const likeButtonRef = useRef<ActionButtonRef>(null);

    useImperativeHandle(ref, () => ({
        animateLike: () => {
            likeButtonRef.current?.animate();
        },
    }));

    return (
        <View style={[styles.container, { bottom }]} pointerEvents="box-none">
            <ActionButton
                ref={likeButtonRef}
                IconComponent={Heart}
                count={formatCount(likesCount)}
                zeroText="Beğen"
                videoId={videoId}
                onPress={onLike}
                isActive={isLiked}
                activeColor={LIKE_COLOR}
            />

            <ActionButton
                IconComponent={Bookmark}
                count={formatCount(savesCount || 0)}
                zeroText="Kaydet"
                videoId={videoId}
                onPress={onSave}
                isActive={isSaved}
                activeColor={SAVE_COLOR}
            />

            <ActionButton
                IconComponent={Send}
                count={formatCount(sharesCount)}
                zeroText="Gönder"
                videoId={videoId}
                onPress={onShare}
                isActive={false}
                activeColor={WHITE}
                canToggle={false}
            />

            <ActionButton
                IconComponent={ShoppingBag}
                count={formatCount(shopsCount || 0)}
                zeroText="Alışveriş"
                videoId={videoId}
                onPress={onShop}
                isActive={false}
                activeColor={WHITE}
                canToggle={false}
            />
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
        right: 8,
        flexDirection: 'column',
        gap: 14,
        alignItems: 'center',
        zIndex: 50,
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
