import React from "react";
import { Pressable, StyleProp, ViewStyle, View } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, SharedValue } from "react-native-reanimated";

interface Props {
    style?: StyleProp<ViewStyle>;
    pressableStyle?: StyleProp<ViewStyle>;
    onPress?: () => void;
    children: React.ReactNode;
}

export default function BouncyPressable({ style, pressableStyle, onPress, children }: Props) {
    const press = useSharedValue(0);

    const scale = useAnimatedStyle(() => ({
        transform: [
            {
                scale: withTiming(press.value ? 1.1 : 1, { duration: 120 }, (finished) => {
                    if (finished) press.value = 0;
                }),
            },
        ],
    }));

    const handlePress = () => {
        press.value = 1;
        onPress?.();
    };

    return (
        <Animated.View style={[style, scale]}>
            <Pressable style={pressableStyle} onPress={handlePress}>
                {children}
            </Pressable>
        </Animated.View>
    );
}
