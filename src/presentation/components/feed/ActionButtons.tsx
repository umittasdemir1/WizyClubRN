import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { Video } from '../../../domain/entities/Video';
import LikeIcon from '../../../../assets/icons/like.svg';
import SaveIcon from '../../../../assets/icons/save.svg';
import ShareIcon from '../../../../assets/icons/share.svg';
import ShoppingIcon from '../../../../assets/icons/shopping.svg';

interface ActionButtonsProps {
    video: Video;
    onLike: () => void;
    onSave: () => void;
    onShare: () => void;
    onShop: () => void;
    onProfilePress: () => void;
}

const FIXED_BOTTOM_POSITION = 70; // Aligned with commercial tag (MetadataLayer)
const ICON_SIZE = 36; // User requested 36px

// Colors
const LIKE_COLOR = '#FF2146';
const SAVE_COLOR = '#FFD700';
const WHITE = '#FFFFFF';

// Heartbeat Animation: 1 → 1.3 → 0.9 → 1.15 → 1
const HEARTBEAT_DURATION = 100;

// Reusable Animated Button with Heartbeat (NO shadows)
const ActionButton = memo(({ onPress, icon: Icon, count, isActive, activeColor }: any) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

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
                <Icon width={ICON_SIZE} height={ICON_SIZE} color={isActive ? activeColor : WHITE} />
            </Animated.View>
            <Text style={styles.count}>{count}</Text>
        </Pressable>
    );
});

export const ActionButtons = memo(function ActionButtons({
    video,
    onLike,
    onSave,
    onShare,
    onShop,
}: ActionButtonsProps) {
    return (
        <View style={[styles.container, { bottom: FIXED_BOTTOM_POSITION }]} pointerEvents="box-none">
            <ActionButton
                icon={LikeIcon}
                count={formatCount(video.likesCount)}
                onPress={onLike}
                isActive={video.isLiked}
                activeColor={LIKE_COLOR}
            />

            <ActionButton
                icon={SaveIcon}
                count={formatCount(video.savesCount || 0)}
                onPress={onSave}
                isActive={video.isSaved}
                activeColor={SAVE_COLOR}
            />

            <ActionButton
                icon={ShareIcon}
                count={formatCount(video.sharesCount)}
                onPress={onShare}
                isActive={false}
                activeColor={WHITE}
            />

            <ActionButton
                icon={ShoppingIcon}
                count={formatCount(video.shopsCount || 0)}
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
        fontSize: 12,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        textAlign: 'center',
        marginTop: -2, // User requested -2 position
    },
});
