import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // 25% of screen
const SWIPE_VELOCITY_THRESHOLD = 800; // Faster threshold
const EDGE_WIDTH = 30;
const EDGE_SWIPE_ACTIVATION_PX = 10; // horizontal movement needed to confirm swipe intent

interface SwipeWrapperProps {
    children: React.ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    enableLeft?: boolean;
    enableRight?: boolean;
    edgeOnly?: boolean;
    edgeTopInset?: number;
    disabled?: boolean;
}

export const SwipeWrapper: React.FC<SwipeWrapperProps> = ({
    children,
    onSwipeLeft,
    onSwipeRight,
    enableLeft = true,
    enableRight = true,
    edgeOnly = false,
    edgeTopInset = 0,
    disabled = false,
}) => {
    const edgeTouchStartX = useSharedValue(0);
    const isEdgeTouch = useSharedValue(false);

    const panGesture = Gesture.Pan()
        .enabled(!disabled)
        .activeOffsetX([-15, 15])
        .failOffsetY([-20, 20])
        .manualActivation(edgeOnly)
        .onTouchesDown((e, state) => {
            if (!edgeOnly) return;

            const touch = e.changedTouches[0];
            const touchX = touch.x;
            const touchY = touch.y;
            const isLeftEdge = touchX < EDGE_WIDTH;
            const isRightEdge = touchX > SCREEN_WIDTH - EDGE_WIDTH;
            const isWithinTopInset = touchY <= edgeTopInset;

            if ((isLeftEdge || isRightEdge) && !isWithinTopInset) {
                // Edge touch detected – don't activate yet.
                // Wait for horizontal movement to distinguish taps from swipes.
                // This allows tap gestures on UI elements near the edge
                // (e.g. the more-options button) to work properly.
                isEdgeTouch.value = true;
                edgeTouchStartX.value = touch.absoluteX;
            } else {
                isEdgeTouch.value = false;
                state.fail();
            }
        })
        .onTouchesMove((e, state) => {
            if (!isEdgeTouch.value) return;

            const touch = e.allTouches[0];

            // If movement is mostly vertical, let the parent ScrollView handle it
            if (Math.abs(touch.absoluteY - touch.y) > 10) {
                isEdgeTouch.value = false;
                state.fail();
                return;
            }

            // Activate once horizontal movement confirms swipe intent
            const dx = Math.abs(touch.absoluteX - edgeTouchStartX.value);
            if (dx > EDGE_SWIPE_ACTIVATION_PX) {
                state.activate();
            }
        })
        .onEnd((e) => {
            isEdgeTouch.value = false;

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
