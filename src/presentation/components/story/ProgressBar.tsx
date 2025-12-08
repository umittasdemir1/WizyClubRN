import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    cancelAnimation,
    runOnJS
} from 'react-native-reanimated';

interface ProgressBarProps {
    progress: number; // 0 to 1
    duration: number; // ms
    isActive: boolean;
    onFinish: () => void;
}

export function ProgressBar({ duration, isActive, onFinish }: ProgressBarProps) {
    const width = useSharedValue(0);

    useEffect(() => {
        if (isActive) {
            width.value = 0;
            width.value = withTiming(100, {
                duration: duration,
                easing: Easing.linear,
            }, (finished) => {
                if (finished) {
                    runOnJS(onFinish)();
                }
            });
        } else {
            cancelAnimation(width);
            width.value = 0;
        }
    }, [isActive, duration]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            width: `${width.value}%`,
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.bar, animatedStyle]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 1,
        overflow: 'hidden',
        flex: 1,
        marginHorizontal: 2,
    },
    bar: {
        height: '100%',
        backgroundColor: 'white',
    },
});
