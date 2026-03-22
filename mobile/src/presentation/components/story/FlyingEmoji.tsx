import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    Easing,
} from 'react-native-reanimated';

interface FlyingEmojiProps {
    emoji: string;
    startX: number;
    startY: number;
}

export function FlyingEmoji({ emoji, startX, startY }: FlyingEmojiProps) {
    const translateY = useSharedValue(0);
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(1);
    const scale = useSharedValue(0);

    useEffect(() => {
        // Fly up with slight horizontal drift
        const drift = (Math.random() - 0.5) * 100; // Random drift -50 to 50

        scale.value = withSequence(
            withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) }),
            withTiming(1.2, { duration: 100 }),
            withTiming(1, { duration: 100 })
        );

        translateY.value = withTiming(-300, {
            duration: 1800,
            easing: Easing.out(Easing.cubic),
        });

        translateX.value = withTiming(drift, {
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
        });

        opacity.value = withSequence(
            withTiming(1, { duration: 200 }),
            withTiming(1, { duration: 1000 }),
            withTiming(0, { duration: 600, easing: Easing.in(Easing.ease) })
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { translateX: translateX.value },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    left: startX,
                    top: startY,
                },
                animatedStyle,
            ]}
        >
            <Text style={styles.emoji}>{emoji}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 50,
    },
    emoji: {
        fontSize: 48,
    },
});
