import React, { useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, GestureResponderEvent } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import LikeIcon from '../../../../assets/icons/doubletablike.svg';

const AnimatedLikeIcon = Animated.createAnimatedComponent(LikeIcon);

interface DoubleTapLikeProps {
    children: React.ReactNode;
    onDoubleTap: () => void;
    onSingleTap?: () => void;
    onLongPress?: (event: GestureResponderEvent) => void;
    onPressOut?: () => void;
}

export interface DoubleTapLikeRef {
    animateLike: () => void;
}

const HEART_COLOR = '#FF2146';
const DOUBLE_TAP_DELAY = 250;

const DoubleTapLikeComponent = forwardRef<DoubleTapLikeRef, DoubleTapLikeProps>(
    ({ children, onDoubleTap, onSingleTap, onLongPress, onPressOut }, ref) => {
        const scale = useSharedValue(0);
        const opacity = useSharedValue(0);
        const rotation = useSharedValue(0);
        const tapCount = useRef(0);
        const tapTimer = useRef<NodeJS.Timeout | null>(null);
        const longPressTriggered = useRef(false);

        const performAnimation = useCallback(() => {
            const randomAngle = Math.random() * 30 - 15;
            rotation.value = randomAngle;
            opacity.value = 1;
            scale.value = 0;

            scale.value = withSpring(1.2, { mass: 0.8, damping: 12, stiffness: 300 }, (finished) => {
                if (finished) {
                    scale.value = withTiming(0, { duration: 150 });
                    opacity.value = withTiming(0, { duration: 150 });
                }
            });
        }, [scale, opacity, rotation]);

        useImperativeHandle(ref, () => ({
            animateLike: performAnimation,
        }));

        const handlePress = useCallback(() => {
            if (longPressTriggered.current) {
                longPressTriggered.current = false;
                return;
            }
            tapCount.current += 1;

            if (tapCount.current === 1) {
                tapTimer.current = setTimeout(() => {
                    if (tapCount.current === 1 && onSingleTap) {
                        onSingleTap();
                    }
                    tapCount.current = 0;
                }, DOUBLE_TAP_DELAY);
            } else if (tapCount.current === 2) {
                if (tapTimer.current) {
                    clearTimeout(tapTimer.current);
                    tapTimer.current = null;
                }
                tapCount.current = 0;

                // 🔥 Animation FIRST, then callback
                performAnimation();
                onDoubleTap();
            }
        }, [onDoubleTap, onSingleTap, performAnimation]);

        const handleLongPress = useCallback((event: GestureResponderEvent) => {
            if (!onLongPress) return;
            longPressTriggered.current = true;
            if (tapTimer.current) {
                clearTimeout(tapTimer.current);
                tapTimer.current = null;
            }
            tapCount.current = 0;
            onLongPress(event);
        }, [onLongPress]);

        const animatedStyle = useAnimatedStyle(() => ({
            transform: [
                { scale: Math.max(scale.value, 0) },
                { rotate: `${rotation.value}deg` },
            ],
            opacity: opacity.value,
        }));

        return (
            <View style={styles.container}>
                {children}

                <TouchableWithoutFeedback
                    onPress={handlePress}
                    onLongPress={onLongPress ? handleLongPress : undefined}
                    onPressOut={onPressOut}
                >
                    <View style={styles.tapLayer} />
                </TouchableWithoutFeedback>

                <View style={styles.iconContainer} pointerEvents="none">
                    <Animated.View style={[styles.heartWrapper, animatedStyle]}>
                        <AnimatedLikeIcon width={100} height={100} color={HEART_COLOR} />
                    </Animated.View>
                </View>
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
    iconContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    heartWrapper: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 20,
    },
});
