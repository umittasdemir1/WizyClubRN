import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, Text, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    runOnJS,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { useBrightnessStore } from '../../store/useBrightnessStore';
import SunIcon from '../../../../assets/icons/sun.svg';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SLIDER_HEIGHT = 200;
const SLIDER_WIDTH = 40;
const THUMB_SIZE = 24;
const TRACK_WIDTH = 4;

interface BrightnessControllerProps {
    // Optional: for positioning relative to sun icon
}

export function BrightnessController({ }: BrightnessControllerProps) {
    const insets = useSafeAreaInsets();
    const { brightness, isControllerVisible, setBrightness, hideController } = useBrightnessStore();

    // Animation values
    const sliderOpacity = useSharedValue(0);
    const sliderScale = useSharedValue(0.8);
    const thumbPosition = useSharedValue((1 - brightness) * SLIDER_HEIGHT);
    const isDragging = useSharedValue(false);
    const startPosition = useSharedValue(0);

    // Sync thumb with brightness when controller opens
    useEffect(() => {
        if (isControllerVisible) {
            sliderOpacity.value = withTiming(1, { duration: 200 });
            sliderScale.value = withSpring(1, { damping: 15 });
            thumbPosition.value = withTiming((1 - brightness) * SLIDER_HEIGHT, { duration: 150 });
        } else {
            sliderOpacity.value = withTiming(0, { duration: 150 });
            sliderScale.value = withTiming(0.8, { duration: 150 });
        }
    }, [isControllerVisible, brightness]);

    const updateBrightness = useCallback((value: number) => {
        setBrightness(value);
    }, [setBrightness]);

    // Pan gesture for slider
    const panGesture = Gesture.Pan()
        .onStart(() => {
            'worklet';
            isDragging.value = true;
            startPosition.value = thumbPosition.value;
        })
        .onUpdate((event) => {
            'worklet';
            // Calculate new position based on starting position + translation
            const newPosition = Math.max(0, Math.min(SLIDER_HEIGHT, startPosition.value + event.translationY));
            thumbPosition.value = newPosition;

            // Convert position to brightness (inverted: top = bright, bottom = dark)
            const newBrightness = 1 - (newPosition / SLIDER_HEIGHT);
            runOnJS(updateBrightness)(newBrightness);
        })
        .onEnd(() => {
            'worklet';
            isDragging.value = false;
        });

    // Tap gesture for quick adjustments
    const tapGesture = Gesture.Tap()
        .onStart((event) => {
            'worklet';
            const tapY = event.y;
            const newPosition = Math.max(0, Math.min(SLIDER_HEIGHT, tapY));
            thumbPosition.value = withSpring(newPosition, { damping: 15 });

            const newBrightness = 1 - (newPosition / SLIDER_HEIGHT);
            runOnJS(updateBrightness)(newBrightness);
        });

    const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

    // Animated styles
    const containerAnimatedStyle = useAnimatedStyle(() => ({
        opacity: sliderOpacity.value,
        transform: [{ scale: sliderScale.value }],
    }));

    const thumbAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: thumbPosition.value - THUMB_SIZE / 2 },
        ],
    }));

    const fillAnimatedStyle = useAnimatedStyle(() => {
        const fillHeight = SLIDER_HEIGHT - thumbPosition.value;
        return {
            height: fillHeight,
            bottom: 0,
        };
    });

    // Calculate brightness percentage for display
    const brightnessPercent = Math.round(brightness * 100);

    if (!isControllerVisible) return null;

    return (
        <>
            {/* Backdrop to close on outside tap */}
            <Pressable
                style={[styles.backdrop, { paddingTop: insets.top }]}
                onPress={hideController}
            />

            {/* Slider Container */}
            <Animated.View
                style={[
                    styles.container,
                    { top: insets.top + 60 },
                    containerAnimatedStyle
                ]}
            >
                {/* Brightness Icon at top */}
                <View style={styles.iconContainer}>
                    <SunIcon width={20} height={20} color="#FFFFFF" />
                </View>

                {/* Slider Track */}
                <GestureDetector gesture={composedGesture}>
                    <View style={styles.sliderContainer}>
                        {/* Background Track */}
                        <View style={styles.track} />

                        {/* Fill (brightness level) */}
                        <Animated.View style={[styles.fill, fillAnimatedStyle]} />

                        {/* Thumb */}
                        <Animated.View style={[styles.thumb, thumbAnimatedStyle]} />
                    </View>
                </GestureDetector>

                {/* Percentage Display */}
                <View style={styles.percentContainer}>
                    <Text style={styles.percentText}>{brightnessPercent}%</Text>
                </View>
            </Animated.View>
        </>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
        zIndex: 9998,
    },
    container: {
        position: 'absolute',
        right: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 20,
        padding: 12,
        alignItems: 'center',
        zIndex: 9999,
        // Glass effect
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: 12,
        opacity: 0.9,
    },
    sliderContainer: {
        width: SLIDER_WIDTH,
        height: SLIDER_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    track: {
        position: 'absolute',
        width: TRACK_WIDTH,
        height: SLIDER_HEIGHT,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: TRACK_WIDTH / 2,
    },
    fill: {
        position: 'absolute',
        width: TRACK_WIDTH,
        backgroundColor: '#FFFFFF',
        borderRadius: TRACK_WIDTH / 2,
    },
    thumb: {
        position: 'absolute',
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        left: (SLIDER_WIDTH - THUMB_SIZE) / 2,
        top: 0,
    },
    percentContainer: {
        marginTop: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    percentText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
});
