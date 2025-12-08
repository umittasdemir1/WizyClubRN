import React from "react";
import { StyleProp, ViewStyle, StyleSheet } from "react-native";
import Animated, {
    useAnimatedProps,
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

const AnimatedBlur = Animated.createAnimatedComponent(BlurView);

interface Props {
    style?: StyleProp<ViewStyle>;
    isVisible: boolean;
    children: React.ReactNode;
}

export default function MorphBlurView({ style, isVisible, children }: Props) {
    const opacityStyle = useAnimatedStyle(() => ({
        opacity: withTiming(isVisible ? 1 : 0, { duration: 200 }),
    }));

    const blurProps = useAnimatedProps(() => ({
        intensity: withTiming(isVisible ? 20 : 0, { duration: 200 }),
    }));

    return (
        <Animated.View style={[style, opacityStyle]}>
            <AnimatedBlur
                animatedProps={blurProps}
                style={{ ...StyleSheet.absoluteFillObject }}
                tint="light"
            />
            {children}
        </Animated.View>
    );
}
