import React, { useRef } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter, usePathname } from 'expo-router';
import { useSharedValue, runOnJS } from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 50;

interface SwipeWrapperProps {
    children: React.ReactNode;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    enableLeft?: boolean;
    enableRight?: boolean;
}

export const SwipeWrapper: React.FC<SwipeWrapperProps & { edgeOnly?: boolean }> = ({
    children,
    onSwipeLeft,
    onSwipeRight,
    enableLeft = true,
    enableRight = true,
    edgeOnly = false
}) => {
    const router = useRouter();

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
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
        .onEnd((e) => {
            if (e.translationX < -SWIPE_THRESHOLD && enableLeft && onSwipeLeft) {
                runOnJS(onSwipeLeft)();
            } else if (e.translationX > SWIPE_THRESHOLD && enableRight && onSwipeRight) {
                runOnJS(onSwipeRight)();
            }
        });

    return (
        <GestureDetector gesture={panGesture}>
            <GestureHandlerRootView style={{ flex: 1 }}>
                {children}
            </GestureHandlerRootView>
        </GestureDetector>
    );
};
