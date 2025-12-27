import React, { useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
} from 'react-native-reanimated';
import LikeIcon from '../../../../assets/icons/doubletablike.svg';

interface DoubleTapLikeProps {
    children: React.ReactNode;
    onDoubleTap: () => void;
    onSingleTap?: () => void;
}

export interface DoubleTapLikeRef {
    animateLike: () => void;
}

const HEART_COLOR = '#FF2146';
const DOUBLE_TAP_DELAY = 250; // 250ms window for double tap

const DoubleTapLikeComponent = forwardRef<DoubleTapLikeRef, DoubleTapLikeProps>(
    ({ children, onDoubleTap, onSingleTap }, ref) => {
        const scale = useSharedValue(0);
        const opacity = useSharedValue(0);
        const rotation = useSharedValue(0);
        const tapCount = useRef(0);
        const tapTimer = useRef<NodeJS.Timeout | null>(null);

        // Ortak Tetikleyici Fonksiyon (Instagram-Style Bouncy Animation)
        const performAnimation = useCallback(() => {
            // 1. Rastgele Eğim (-15 ile +15 derece arası organik his için)
            const randomAngle = Math.random() * 30 - 15;
            rotation.value = randomAngle;

            opacity.value = 1;
            scale.value = 0; // Reset

            // 2. Instagram Tarzı "Bouncy" Spring Fiziği
            scale.value = withSpring(
                1.2,
                {
                    mass: 1,
                    damping: 10, // Düşük sürtünme = çok sallanma
                    stiffness: 250, // Yüksek sertlik = hızlı tepki
                },
                (finished) => {
                    if (finished) {
                        // Animasyon bitince HIZLI kaybol
                        scale.value = withTiming(0, { duration: 80 });
                        opacity.value = withTiming(0, { duration: 80 });
                    }
                }
            );
        }, [scale, opacity, rotation]);

        // Expose animateLike method via ref
        useImperativeHandle(ref, () => ({
            animateLike: performAnimation,
        }));

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
                performAnimation();
                onDoubleTap();
            }
        }, [onDoubleTap, onSingleTap, performAnimation]);

        const animatedStyle = useAnimatedStyle(() => ({
            transform: [
                { scale: Math.max(scale.value, 0) },
                { rotate: `${rotation.value}deg` },
            ],
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
);

DoubleTapLikeComponent.displayName = 'DoubleTapLike';

export const DoubleTapLike = DoubleTapLikeComponent;

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
