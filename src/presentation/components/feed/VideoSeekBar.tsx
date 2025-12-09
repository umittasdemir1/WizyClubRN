import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
    interpolate,
    useDerivedValue,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useActiveVideoStore, ActiveVideoState } from '../../store/useActiveVideoStore';
import { formatTime } from '../../../core/utils';

interface VideoSeekBarProps {
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    isActive?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

const HORIZONTAL_PADDING = 16;
const TOUCH_AREA_HEIGHT = 40;
const THUMB_SIZE = 12;
const TRACK_HEIGHT = 4;
const TRACK_HEIGHT_EXPANDED = 6;
const BAR_WIDTH = SCREEN_WIDTH - (HORIZONTAL_PADDING * 2);

export function VideoSeekBar({
    currentTime,
    duration,
    onSeek,
    isActive = true
}: VideoSeekBarProps) {
    const insets = useSafeAreaInsets();
    const setSeeking = useActiveVideoStore((state: ActiveVideoState) => state.setSeeking);
    const [displayTime, setDisplayTime] = useState(0);

    const progress = useSharedValue(0);
    const isScrubbing = useSharedValue(false);
    const thumbScale = useSharedValue(1);
    const trackHeight = useSharedValue(TRACK_HEIGHT);
    const tooltipOpacity = useSharedValue(0);

    const finalBottomPosition = -18;

    // Standard approach: Direct value assignment (no animation)
    // Used by TikTok, YouTube, Instagram
    useEffect(() => {
        if (!isScrubbing.value && duration > 0) {
            progress.value = currentTime / duration;
        }
    }, [currentTime, duration]);

    const triggerHaptic = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const startScrubbing = useCallback(() => {
        setSeeking(true);
    }, [setSeeking]);

    const updateSeek = useCallback((percentage: number) => {
        if (duration > 0) {
            onSeek(percentage * duration);
        }
    }, [duration, onSeek]);

    const endScrubbing = useCallback((percentage: number) => {
        if (duration > 0) {
            onSeek(percentage * duration);
        }
        setSeeking(false);
    }, [duration, onSeek, setSeeking]);

    const pan = Gesture.Pan()
        .onBegin((event) => {
            'worklet';
            isScrubbing.value = true;
            thumbScale.value = withSpring(1.5);
            trackHeight.value = withTiming(TRACK_HEIGHT_EXPANDED, { duration: 100 });
            tooltipOpacity.value = withTiming(1, { duration: 100 });
            const absoluteX = event.absoluteX - HORIZONTAL_PADDING;
            const newProgress = Math.max(0, Math.min(absoluteX / BAR_WIDTH, 1));
            progress.value = newProgress;
            runOnJS(setDisplayTime)(newProgress * (duration || 0));
            runOnJS(startScrubbing)();
            runOnJS(triggerHaptic)();
        })
        .onUpdate((event) => {
            'worklet';
            const absoluteX = event.absoluteX - HORIZONTAL_PADDING;
            const newProgress = Math.max(0, Math.min(absoluteX / BAR_WIDTH, 1));
            progress.value = newProgress;
            runOnJS(setDisplayTime)(newProgress * (duration || 0));
        })
        .onEnd(() => {
            'worklet';
            isScrubbing.value = false;
            thumbScale.value = withSpring(1);
            trackHeight.value = withTiming(TRACK_HEIGHT, { duration: 150 });
            tooltipOpacity.value = withTiming(0, { duration: 150 });
            runOnJS(endScrubbing)(progress.value);
            runOnJS(triggerHaptic)();
        });

    const tap = Gesture.Tap()
        .onStart((event) => {
            'worklet';
            const absoluteX = event.absoluteX - HORIZONTAL_PADDING;
            const newProgress = Math.max(0, Math.min(absoluteX / BAR_WIDTH, 1));
            progress.value = newProgress;
            runOnJS(updateSeek)(newProgress);
            runOnJS(triggerHaptic)();
        });

    const composedGesture = Gesture.Race(pan, tap);

    const animatedTrackStyle = useAnimatedStyle(() => ({
        height: trackHeight.value,
    }));

    const animatedProgressStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
        height: trackHeight.value,
    }));

    const thumbOpacity = useDerivedValue(() => {
        return withTiming(isScrubbing.value ? 1 : 0, { duration: 200 });
    });

    const animatedThumbStyle = useAnimatedStyle(() => ({
        opacity: thumbOpacity.value,
        transform: [
            { translateX: progress.value * BAR_WIDTH - THUMB_SIZE / 2 },
            { scale: thumbScale.value },
        ],
    }));

    const animatedTooltipStyle = useAnimatedStyle(() => {
        const leftPosition = progress.value * BAR_WIDTH;
        const tooltipHalfWidth = 50;
        const clampedLeft = Math.max(tooltipHalfWidth, Math.min(leftPosition, BAR_WIDTH - tooltipHalfWidth));
        return {
            opacity: tooltipOpacity.value,
            transform: [
                { translateX: clampedLeft - tooltipHalfWidth },
                { translateY: interpolate(tooltipOpacity.value, [0, 1], [5, 0]) },
            ],
        };
    });

    if (!isActive) return null;

    return (
        <View style={[styles.container, { bottom: finalBottomPosition }]}>
            <Animated.View style={[styles.tooltip, animatedTooltipStyle]}>
                <View style={styles.tooltipContent}>
                    <Text style={styles.tooltipText}>
                        {formatTime(displayTime)} | {formatTime(duration)}
                    </Text>
                </View>
                <View style={styles.tooltipArrow} />
            </Animated.View>

            <GestureDetector gesture={composedGesture}>
                <View style={styles.touchArea}>
                    <Animated.View style={[styles.track, animatedTrackStyle]} />
                    <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
                    <Animated.View style={[styles.thumb, animatedThumbStyle]} />
                </View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: HORIZONTAL_PADDING,
        right: HORIZONTAL_PADDING,
        zIndex: 50,
    },
    touchArea: {
        height: TOUCH_AREA_HEIGHT,
        justifyContent: 'center',
    },
    track: {
        position: 'absolute',
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 1,
    },
    progressFill: {
        position: 'absolute',
        left: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 1,
    },
    thumb: {
        position: 'absolute',
        left: 0,
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    tooltip: {
        position: 'absolute',
        bottom: TOUCH_AREA_HEIGHT + 8,
        minWidth: 100,
        alignItems: 'center',
    },
    tooltipContent: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    tooltipText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    tooltipArrow: {
        display: 'none',
    },
});
