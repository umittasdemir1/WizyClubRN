import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedProps,
    withSequence,
    withTiming,
    withSpring,
    interpolateColor,
    Easing,
} from 'react-native-reanimated';
import { Video } from '../../../domain/entities/Video';
import LikeIcon from '../../../../assets/icons/like.svg';
import SaveIcon from '../../../../assets/icons/save.svg';
import ShareIcon from '../../../../assets/icons/share.svg';
import ShoppingIcon from '../../../../assets/icons/shopping.svg';

// Animated SVG components
const AnimatedLikeIcon = Animated.createAnimatedComponent(LikeIcon);
const AnimatedSaveIcon = Animated.createAnimatedComponent(SaveIcon);
const AnimatedShareIcon = Animated.createAnimatedComponent(ShareIcon);
const AnimatedShoppingIcon = Animated.createAnimatedComponent(ShoppingIcon);

interface ActionButtonsProps {
    isLiked: boolean;
    likesCount: number;
    isSaved: boolean;
    savesCount: number;
    sharesCount: number;
    shopsCount: number;
    onLike: () => void;
    onSave: () => void;
    onShare: () => void;
    onShop: () => void;
    onProfilePress: () => void;
}

const BASE_BOTTOM_POSITION = 120; // Restored to old place (90 + 30)
const SAFE_AREA_OFFSET = 100; // Restored to old place (70 + 30)
const ICON_SIZE = 38; // User requested 38px

// Colors
const LIKE_COLOR = '#FF2146';
const SAVE_COLOR = '#FFD700';
const WHITE = '#FFFFFF';

// Heartbeat Animation: 1 → 1.3 → 0.9 → 1.15 → 1
const HEARTBEAT_DURATION = 100;

// Reusable Animated Button with Heartbeat (NO shadows)
const ActionButton = memo(({ onPress, icon: Icon, count, isActive, activeColor }: any) => {
    const scale = useSharedValue(1);
    const colorProgress = useSharedValue(0);

    // Renk değişimini smooth yap (senkron)
    useEffect(() => {
        colorProgress.value = withSpring(isActive ? 1 : 0, {
            damping: 15,
            stiffness: 150,
        });
    }, [isActive, colorProgress]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const animatedProps = useAnimatedProps(() => {
        const color = interpolateColor(
            colorProgress.value,
            [0, 1],
            [WHITE, activeColor]
        );
        return { color };
    });

    const handlePress = () => {
        scale.value = withSequence(
            withTiming(1.3, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) }),
            withTiming(0.9, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.15, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) })
        );
        onPress();
    };

    return (
        <Pressable
            onPress={handlePress}
            style={styles.buttonContainer}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
            <Animated.View style={[styles.iconWrapper, animatedStyle]}>
                <Icon width={ICON_SIZE} height={ICON_SIZE} animatedProps={animatedProps} />
            </Animated.View>
            <Text style={styles.count}>{count}</Text>
        </Pressable>
    );
});

export const ActionButtons = memo(function ActionButtons({
    isLiked,
    likesCount,
    isSaved,
    savesCount,
    sharesCount,
    shopsCount,
    onLike,
    onSave,
    onShare,
    onShop,
}: ActionButtonsProps) {
    const insets = useSafeAreaInsets();
    const bottom = Math.max(BASE_BOTTOM_POSITION, insets.bottom + SAFE_AREA_OFFSET);

    return (
        <View style={[styles.container, { bottom }]} pointerEvents="box-none">
            <ActionButton
                icon={AnimatedLikeIcon}
                count={formatCount(likesCount)}
                onPress={onLike}
                isActive={isLiked}
                activeColor={LIKE_COLOR}
            />

            <ActionButton
                icon={AnimatedSaveIcon}
                count={formatCount(savesCount || 0)}
                onPress={onSave}
                isActive={isSaved}
                activeColor={SAVE_COLOR}
            />

            <ActionButton
                icon={AnimatedShareIcon}
                count={formatCount(sharesCount)}
                onPress={onShare}
                isActive={false}
                activeColor={WHITE}
            />

            <ActionButton
                icon={AnimatedShoppingIcon}
                count={formatCount(shopsCount || 0)}
                onPress={onShop}
                isActive={false}
                activeColor={WHITE}
            />
        </View>
    );
});

function formatCount(count: number): string {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 8,
        flexDirection: 'column',
        gap: 5, // User requested 5px gap
        alignItems: 'center',
        zIndex: 50,
    },
    buttonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        // NO shadow, NO background
    },
    count: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        textAlign: 'center',
        marginTop: -2, // User requested -2 position
    },
});
