import React from "react";
import { View, StyleSheet } from "react-native";
import { Flame, Star } from "lucide-react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    interpolate,
    Extrapolation,
    withSpring,
    withTiming,
    SharedValue
} from "react-native-reanimated";
import { EXPAND_BTN_WIDTH } from "./constants";
import BouncyPressable from "./BouncyPressable";

interface TabItemProps {
    title: string;
    index: number;
    shared: SharedValue<number>;
    onPress: (index: number) => void;
    activeIcon: React.ReactNode;
    inactiveIcon: React.ReactNode;
}

const TabItem = ({ title, index, shared, onPress, activeIcon, inactiveIcon }: TabItemProps) => {
    // Opacity-based color transition (safer for Lucide functional components)
    const activeOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(
            shared.value,
            [0, 1],
            index === 0 ? [1, 0] : [0, 1],
            Extrapolation.CLAMP
        ),
    }));

    const inactiveOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(
            shared.value,
            [0, 1],
            index === 0 ? [0, 1] : [1, 0],
            Extrapolation.CLAMP
        ),
    }));

    const textStyle = useAnimatedStyle(() => ({
        color: shared.value === index ? "rgb(233,78,62)" : "black",
    }));

    return (
        <BouncyPressable
            style={{ flex: 1 }}
            pressableStyle={styles.tabPressable}
            onPress={() => onPress(index)}
        >
            <View style={{ position: 'relative', width: 22, height: 22 }}>
                {/* Active Icon */}
                <Animated.View style={[{ position: 'absolute' }, activeOpacity]}>
                    {activeIcon}
                </Animated.View>
                {/* Inactive Icon */}
                <Animated.View style={[{ position: 'absolute' }, inactiveOpacity]}>
                    {inactiveIcon}
                </Animated.View>
            </View>
            <Animated.Text style={[styles.label, textStyle]}>
                {title}
            </Animated.Text>
        </BouncyPressable>
    );
};

export default function MorphedTabView() {
    const shared = useSharedValue(0);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateX: withSpring(shared.value === 0 ? 0 : EXPAND_BTN_WIDTH / 2, {
                    damping: 90,
                }),
            },
        ],
    }));

    const onTabPress = (i: number) => {
        shared.value = withTiming(i, { duration: 220 });
    };

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.indicatorContainer, indicatorStyle]}>
                <View style={styles.indicator} />
            </Animated.View>

            <TabItem
                title="Popüler"
                index={0}
                shared={shared}
                onPress={onTabPress}
                activeIcon={<Flame color="rgb(233,78,62)" size={22} />}
                inactiveIcon={<Flame color="black" size={22} />}
            />
            <TabItem
                title="Favoriler"
                index={1}
                shared={shared}
                onPress={onTabPress}
                activeIcon={<Star color="rgb(233,78,62)" size={22} />}
                inactiveIcon={<Star color="black" size={22} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 50,
        width: EXPAND_BTN_WIDTH,
        borderRadius: 40,
        flexDirection: "row",
        overflow: "hidden",
        alignItems: "center",
    },
    tabPressable: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
    },
    indicatorContainer: {
        ...StyleSheet.absoluteFillObject,
        width: EXPAND_BTN_WIDTH / 2,
        padding: 3,
    },
    indicator: {
        flex: 1,
        backgroundColor: "rgba(233,78,62,0.15)",
        borderRadius: 40,
    },
});
