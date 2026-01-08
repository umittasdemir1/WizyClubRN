import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { runOnJS } from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // 25% of screen
const SWIPE_VELOCITY_THRESHOLD = 800; // Faster threshold

interface SwipeWrapperProps {
    children: React.ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    enableLeft?: boolean;
    enableRight?: boolean;
    edgeOnly?: boolean;
    disabled?: boolean;
}

export const SwipeWrapper: React.FC<SwipeWrapperProps> = ({
    children,
    onSwipeLeft,
    onSwipeRight,
    enableLeft = true,
    enableRight = true,
    edgeOnly = false,
    disabled = false,
}) => {
    const router = useRouter();

    const panGesture = Gesture.Pan()
        .enabled(!disabled)
        .activeOffsetX([-15, 15])
        .failOffsetY([-20, 20])
        .manualActivation(edgeOnly)
        .onTouchesDown((e, state) => {
            if (!edgeOnly) return;

            const touchX = e.changedTouches[0].x;
            const isLeftEdge = touchX < 30;
            const isRightEdge = touchX > SCREEN_WIDTH - 30;

            if (isLeftEdge || isRightEdge) {
                state.activate();
            } else {
                state.fail();
            }
        })
        .onTouchesMove((e, state) => {
            // If movement is mostly vertical, let the parent ScrollView handle it
            const touch = e.allTouches[0];
            if (Math.abs(touch.absoluteY - touch.y) > 10) {
                state.fail();
            }
        })
        .onEnd((e) => {
            const shouldSwipeLeft =
                e.translationX < -SWIPE_THRESHOLD ||
                (e.translationX < -50 && e.velocityX < -SWIPE_VELOCITY_THRESHOLD);

            const shouldSwipeRight =
                e.translationX > SWIPE_THRESHOLD ||
                (e.translationX > 50 && e.velocityX > SWIPE_VELOCITY_THRESHOLD);

            if (shouldSwipeLeft && enableLeft && onSwipeLeft) {
                runOnJS(onSwipeLeft)();
            } else if (shouldSwipeRight && enableRight && onSwipeRight) {
                runOnJS(onSwipeRight)();
            }
        });

    return (
        <GestureHandlerRootView style={styles.container}>
            <GestureDetector gesture={panGesture}>
                {children}
            </GestureDetector>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
