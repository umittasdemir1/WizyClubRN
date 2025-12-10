import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import LikeIcon from '../../../../assets/icons/doubletablike.svg';

interface DoubleTapLikeProps {
    children: React.ReactNode;
    onDoubleTap: () => void;
    onSingleTap?: () => void;
}

// Heartbeat Animation Keyframes: 1 → 1.3 → 0.9 → 1.15 → 1
const HEARTBEAT_DURATION = 100;
const HEART_COLOR = '#FF2146';
const DOUBLE_TAP_DELAY = 250; // 250ms window for double tap

export function DoubleTapLike({ children, onDoubleTap, onSingleTap }: DoubleTapLikeProps) {
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const tapCount = useRef(0);
    const tapTimer = useRef<NodeJS.Timeout | null>(null);

    // Handle tap with double tap detection
    const handlePress = useCallback(() => {
        tapCount.current += 1;

        if (tapCount.current === 1) {
            // First tap - wait for potential second tap
            tapTimer.current = setTimeout(() => {
                // Single tap confirmed - toggle play/pause
                if (tapCount.current === 1 && onSingleTap) {
                    onSingleTap();
                }
                tapCount.current = 0;
            }, DOUBLE_TAP_DELAY);
        } else if (tapCount.current === 2) {
            // Double tap detected!
            if (tapTimer.current) {
                clearTimeout(tapTimer.current);
                tapTimer.current = null;
            }
            tapCount.current = 0;

            // Trigger like animation
            scale.value = 0;
            opacity.value = 1;

            // Heartbeat Animation: 0 → 1.3 → 0.9 → 1.15 → 1 → Hold → Fade out
            scale.value = withSequence(
                withTiming(1.3, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) }),
                withTiming(0.9, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
                withTiming(1.15, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) }),
                withDelay(400, withTiming(0, { duration: 200 }))
            );

            opacity.value = withDelay(600, withTiming(0, { duration: 200 }));

            onDoubleTap();
        }
    }, [onDoubleTap, onSingleTap, scale, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: Math.max(scale.value, 0) }],
        opacity: opacity.value,
    }));

    return (
        <View style={styles.container}>
            {/* Children rendered first */}
            {children}

            {/* Tap detection layer - absolute overlay */}
            <TouchableWithoutFeedback onPress={handlePress}>
                <View style={styles.tapLayer} />
            </TouchableWithoutFeedback>

            {/* Heart Icon with Deep Shadow */}
            <View style={styles.iconContainer} pointerEvents="none">
                <Animated.View style={[styles.heartWrapper, animatedStyle]}>
                    <LikeIcon width={100} height={100} color={HEART_COLOR} />
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tapLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5, // Below UI buttons but above video
        bottom: 100, // Leave space for Seekbar (80px + margin)
    },
    iconContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    heartWrapper: {
        // Deep Shadow (drop-shadow-2xl equivalent)
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 20,
    },
});
