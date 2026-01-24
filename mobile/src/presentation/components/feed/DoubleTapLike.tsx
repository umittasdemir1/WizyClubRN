import React, { useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback, GestureResponderEvent, Dimensions } from 'react-native';
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
    onPressIn?: (event: GestureResponderEvent) => void;
}

export interface DoubleTapLikeRef {
    animateLike: () => void;
}

const HEART_COLOR = '#FF2146';
const HEART_SIZE = 100;
const DOUBLE_TAP_DELAY = 350;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TAP_Y_OFFSET = HEART_SIZE * 0.6;

const DoubleTapLikeComponent = forwardRef<DoubleTapLikeRef, DoubleTapLikeProps>(
    ({ children, onDoubleTap, onSingleTap, onLongPress, onPressOut, onPressIn }, ref) => {
        const scale = useSharedValue(0);
        const opacity = useSharedValue(0);
        const rotation = useSharedValue(0);
        const heartX = useSharedValue(SCREEN_WIDTH / 2);
        const heartY = useSharedValue(SCREEN_HEIGHT / 2);
        const tapCount = useRef(0);
        const tapTimer = useRef<NodeJS.Timeout | null>(null);
        const longPressTriggered = useRef(false);
        const containerSizeRef = useRef({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
        const lastTapTimeRef = useRef(0);

        const performAnimation = useCallback((x?: number, y?: number) => {
            const randomAngle = Math.random() * 30 - 15;
            rotation.value = randomAngle;
            if (typeof x === 'number' && typeof y === 'number') {
                heartX.value = x;
                heartY.value = y;
            }
            opacity.value = 1;
            scale.value = 0;

            scale.value = withSpring(1.2, { mass: 0.8, damping: 12, stiffness: 300 }, (finished) => {
                if (finished) {
                    scale.value = withTiming(0, { duration: 150 });
                    opacity.value = withTiming(0, { duration: 150 });
                }
            });
        }, [scale, opacity, rotation, heartX, heartY]);

        useImperativeHandle(ref, () => ({
            animateLike: performAnimation,
        }));

        const handlePress = useCallback((event: GestureResponderEvent) => {
            if (longPressTriggered.current) {
                longPressTriggered.current = false;
                return;
            }
            tapCount.current += 1;
            const tapTime = Date.now();
            lastTapTimeRef.current = tapTime;
            const rawX = event.nativeEvent.locationX;
            const rawY = event.nativeEvent.locationY - TAP_Y_OFFSET;
            const { width, height } = containerSizeRef.current;
            const tapX = Math.max(HEART_SIZE / 2, Math.min(width - HEART_SIZE / 2, rawX));
            const tapY = Math.max(HEART_SIZE / 2, Math.min(height - HEART_SIZE / 2, rawY));

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

                // Animation first, then callback
                performAnimation(tapX, tapY);
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
            lastTapTimeRef.current = 0;
            onLongPress(event);
        }, [onLongPress]);

        const animatedStyle = useAnimatedStyle(() => ({
            position: 'absolute',
            transform: [
                { translateX: heartX.value - HEART_SIZE / 2 },
                { translateY: heartY.value - HEART_SIZE / 2 },
                { scale: Math.max(scale.value, 0) },
                { rotate: `${rotation.value}deg` },
            ],
            opacity: opacity.value,
        }));

        return (
            <View
                style={styles.container}
                onLayout={(event) => {
                    containerSizeRef.current = {
                        width: event.nativeEvent.layout.width,
                        height: event.nativeEvent.layout.height,
                    };
                }}
            >
                {children}

                <TouchableWithoutFeedback
                    onPress={handlePress}
                    onLongPress={onLongPress ? handleLongPress : undefined}
                    onPressOut={onPressOut}
                    onPressIn={onPressIn}
                >
                    <View style={styles.tapLayer} />
                </TouchableWithoutFeedback>

                <View style={styles.iconContainer} pointerEvents="none">
                    <Animated.View style={[styles.heartWrapper, animatedStyle]}>
                        <AnimatedLikeIcon width={HEART_SIZE} height={HEART_SIZE} color={HEART_COLOR} />
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
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
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
