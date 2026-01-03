import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, ScrollViewProps } from 'react-native';
import { RotateCw } from 'lucide-react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
    interpolate,
    Extrapolation,
    runOnJS,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const PULL_THRESHOLD = 60;

interface CustomRefreshScrollViewProps extends Omit<ScrollViewProps, 'refreshControl'> {
    refreshing: boolean;
    onRefresh: () => void;
    isDark?: boolean;
    children: React.ReactNode;
}

export function CustomRefreshScrollView({
    refreshing,
    onRefresh,
    isDark = true,
    children,
    ...scrollViewProps
}: CustomRefreshScrollViewProps) {
    const pullDistance = useSharedValue(0);
    const isAtTop = useSharedValue(true);
    const rotation = useSharedValue(0);

    // Start spinning when refreshing
    useEffect(() => {
        if (refreshing) {
            rotation.value = withRepeat(
                withTiming(360, { duration: 800, easing: Easing.linear }),
                -1,
                false
            );
        } else {
            cancelAnimation(rotation);
            rotation.value = withTiming(0, { duration: 200 });
            pullDistance.value = withSpring(0, { damping: 15 });
        }
    }, [refreshing]);

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (isAtTop.value && e.translationY > 0 && !refreshing) {
                pullDistance.value = Math.min(e.translationY * 0.25, 80);
            }
        })
        .onEnd(() => {
            if (pullDistance.value >= PULL_THRESHOLD && !refreshing) {
                runOnJS(onRefresh)();
            } else {
                pullDistance.value = withSpring(0, { damping: 15 });
            }
        });

    const contentAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: pullDistance.value }],
    }));

    const indicatorAnimatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            pullDistance.value,
            [0, 30, PULL_THRESHOLD],
            [0, 0.5, 1],
            Extrapolation.CLAMP
        );
        const scale = interpolate(
            pullDistance.value,
            [0, PULL_THRESHOLD],
            [0.5, 1],
            Extrapolation.CLAMP
        );
        return { opacity, transform: [{ scale }] };
    });

    const spinAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    return (
        <View style={styles.container}>
            {/* Spinning Refresh Icon */}
            <Animated.View style={[styles.refreshContainer, indicatorAnimatedStyle]}>
                <Animated.View style={spinAnimatedStyle}>
                    <RotateCw size={24} color={isDark ? '#FFFFFF' : '#000000'} strokeWidth={2} />
                </Animated.View>
            </Animated.View>

            {/* Content with Gesture */}
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.contentWrapper, contentAnimatedStyle]}>
                    <ScrollView
                        {...scrollViewProps}
                        scrollEventThrottle={16}
                        onScroll={(e) => {
                            isAtTop.value = e.nativeEvent.contentOffset.y <= 0;
                            scrollViewProps.onScroll?.(e);
                        }}
                    >
                        {children}
                    </ScrollView>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    refreshContainer: {
        position: 'absolute',
        top: 10,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    contentWrapper: {
        flex: 1,
    },
});
