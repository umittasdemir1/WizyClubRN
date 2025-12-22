import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3; // 30% of screen
const SWIPE_VELOCITY_THRESHOLD = 500;

interface SwipeWrapperProps {
    children: React.ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    enableLeft?: boolean;
    enableRight?: boolean;
    edgeOnly?: boolean;
}

export const SwipeWrapper: React.FC<SwipeWrapperProps> = ({
    children,
    onSwipeLeft,
    onSwipeRight,
    enableLeft = true,
    enableRight = true,
    edgeOnly = false,
}) => {
    const router = useRouter();
    const translationX = useSharedValue(0);
    const shadowOpacity = useSharedValue(0);

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-15, 15])
        .manualActivation(edgeOnly)
        .onTouchesDown((e, state) => {
            if (!edgeOnly) return;

            const touchX = e.changedTouches[0].x;
            const isLeftEdge = touchX < 50;
            const isRightEdge = touchX > SCREEN_WIDTH - 50;

            if (isLeftEdge || isRightEdge) {
                state.activate();
            } else {
                state.fail();
            }
        })
        .onUpdate((e) => {
            // Only allow swipe in enabled directions
            if (e.translationX < 0 && !enableLeft) return;
            if (e.translationX > 0 && !enableRight) return;

            translationX.value = e.translationX;
            // Calculate shadow opacity based on translation (0 to 0.3)
            shadowOpacity.value = Math.min(Math.abs(e.translationX) / SCREEN_WIDTH, 0.3);
        })
        .onEnd((e) => {
            const shouldSwipeLeft =
                e.translationX < -SWIPE_THRESHOLD ||
                (e.translationX < 0 && e.velocityX < -SWIPE_VELOCITY_THRESHOLD);

            const shouldSwipeRight =
                e.translationX > SWIPE_THRESHOLD ||
                (e.translationX > 0 && e.velocityX > SWIPE_VELOCITY_THRESHOLD);

            if (shouldSwipeLeft && enableLeft && onSwipeLeft) {
                // Animate to left edge then navigate
                translationX.value = withTiming(-SCREEN_WIDTH, { duration: 200 }, () => {
                    runOnJS(onSwipeLeft)();
                    translationX.value = 0;
                    shadowOpacity.value = 0;
                });
            } else if (shouldSwipeRight && enableRight && onSwipeRight) {
                // Animate to right edge then navigate
                translationX.value = withTiming(SCREEN_WIDTH, { duration: 200 }, () => {
                    runOnJS(onSwipeRight)();
                    translationX.value = 0;
                    shadowOpacity.value = 0;
                });
            } else {
                // Snap back
                translationX.value = withSpring(0, { damping: 20, stiffness: 300 });
                shadowOpacity.value = withTiming(0, { duration: 200 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translationX.value }],
    }));

    const leftShadowStyle = useAnimatedStyle(() => ({
        opacity: translationX.value < 0 ? shadowOpacity.value : 0,
    }));

    const rightShadowStyle = useAnimatedStyle(() => ({
        opacity: translationX.value > 0 ? shadowOpacity.value : 0,
    }));

    return (
        <GestureHandlerRootView style={styles.container}>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.container, animatedStyle]}>
                    {/* Left shadow (appears when swiping left) */}
                    <Animated.View
                        style={[styles.shadow, styles.shadowLeft, leftShadowStyle]}
                        pointerEvents="none"
                    />
                    {/* Right shadow (appears when swiping right) */}
                    <Animated.View
                        style={[styles.shadow, styles.shadowRight, rightShadowStyle]}
                        pointerEvents="none"
                    />
                    {children}
                </Animated.View>
            </GestureDetector>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    shadow: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 10,
        zIndex: 999,
    },
    shadowLeft: {
        left: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    shadowRight: {
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        shadowColor: '#000',
        shadowOffset: { width: -5, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
});
