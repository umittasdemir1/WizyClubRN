import React, { useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, GestureResponderEvent } from 'react-native';

interface DoubleTapLikeProps {
    children: React.ReactNode;
    onDoubleTap: () => void;
    onSingleTap?: () => void;
    onLongPress?: (event: GestureResponderEvent) => void;
    onPressOut?: () => void;
    onPressIn?: (event: GestureResponderEvent) => void;
}

export interface DoubleTapLikeRef {
    animateLike: () => void;
}

const DOUBLE_TAP_DELAY = 350;

const DoubleTapLikeComponent = forwardRef<DoubleTapLikeRef, DoubleTapLikeProps>(
    ({ children, onDoubleTap, onSingleTap, onLongPress, onPressOut, onPressIn }, ref) => {
        const tapCount = useRef(0);
        const tapTimer = useRef<NodeJS.Timeout | null>(null);
        const longPressTriggered = useRef(false);
        const lastTapTimeRef = useRef(0);

        const performAnimation = useCallback(() => {}, []);

        useImperativeHandle(ref, () => ({
            animateLike: performAnimation,
        }), [performAnimation]);

        const handlePress = useCallback((_event: GestureResponderEvent) => {
            if (longPressTriggered.current) {
                longPressTriggered.current = false;
                return;
            }
            tapCount.current += 1;
            const tapTime = Date.now();
            lastTapTimeRef.current = tapTime;

            if (tapCount.current === 1) {
                tapTimer.current = setTimeout(() => {
                    if (tapCount.current === 1 && onSingleTap && lastTapTimeRef.current === tapTime) {
                        onSingleTap();
                    }
                    tapCount.current = 0;
                    lastTapTimeRef.current = 0;
                }, DOUBLE_TAP_DELAY);
            } else if (tapCount.current === 2) {
                if (tapTimer.current) {
                    clearTimeout(tapTimer.current);
                    tapTimer.current = null;
                }
                tapCount.current = 0;
                lastTapTimeRef.current = 0;

                onDoubleTap();
            }
        }, [onDoubleTap, onSingleTap]);

        const handleLongPress = useCallback((event: GestureResponderEvent) => {
            if (!onLongPress) return;
            longPressTriggered.current = true;
            if (tapTimer.current) {
                clearTimeout(tapTimer.current);
                tapTimer.current = null;
            }
            tapCount.current = 0;
            lastTapTimeRef.current = 0;
            onLongPress(event);
        }, [onLongPress]);

        return (
            <View style={styles.container}>
                {children}

                <TouchableWithoutFeedback
                    onPress={handlePress}
                    onLongPress={onLongPress ? handleLongPress : undefined}
                    onPressOut={onPressOut}
                    onPressIn={onPressIn}
                >
                    <View style={styles.tapLayer} />
                </TouchableWithoutFeedback>
            </View>
        );
    }
);

DoubleTapLikeComponent.displayName = 'DoubleTapLike';

export const DoubleTapLike = DoubleTapLikeComponent;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tapLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5,
        bottom: 100,
    },
});
