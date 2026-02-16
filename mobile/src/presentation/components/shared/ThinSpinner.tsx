import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, ViewStyle } from 'react-native';

interface ThinSpinnerProps {
    size?: number;
    borderWidth?: number;
    color?: string;
    style?: ViewStyle;
}

export function ThinSpinner({ size = 80, borderWidth = 2.5, color = '#FFFFFF', style }: ThinSpinnerProps) {
    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 800,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        ).start();
    }, [spinAnim]);

    const rotate = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <Animated.View
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth,
                    borderColor: `${color}26`,
                    borderTopColor: color,
                    transform: [{ rotate }],
                },
                style,
            ]}
        />
    );
}
