import React, { useRef, useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useDerivedValue,
    useAnimatedReaction,
    withTiming,
    runOnJS,
    SharedValue,
    interpolate,
    interpolateColor,
    Extrapolation,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useActiveVideoStore, ActiveVideoState } from '../../store/useActiveVideoStore';
import { formatTime } from '../../../core/utils';

interface VideoSeekBarProps {
    currentTime: SharedValue<number>;
    duration: SharedValue<number>;
    isScrolling?: SharedValue<boolean>;
    onSeek: (time: number) => void;
    isActive?: boolean;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const HORIZONTAL_PADDING = 16;
const TOUCH_AREA_HEIGHT = 60; // Increased
const THUMB_SIZE = 14;
const TRACK_HEIGHT = 2; // Very thin by default
const TRACK_HEIGHT_EXPANDED = 12; // Thick on touch
const BAR_WIDTH = SCREEN_WIDTH - (HORIZONTAL_PADDING * 2);

export function VideoSeekBar({
    currentTime,
    duration,
    isScrolling,
    onSeek,
    isActive = true
}: VideoSeekBarProps) {
    const setSeeking = useActiveVideoStore((state: ActiveVideoState) => state.setSeeking);
    const [displayTime, setDisplayTime] = useState(0); // Only for tooltip text
    const [displayDuration, setDisplayDuration] = useState(0); // Avoid reading SharedValue during render

    const isScrubbing = useSharedValue(false);
    const thumbScale = useSharedValue(1);
    const trackHeight = useSharedValue(TRACK_HEIGHT);
    const tooltipOpacity = useSharedValue(0);

    // --- LAYOUT CONFIGURATION ---
    // 'safe': Automatically calculates TabBar height + Safe Area (Visible)
    // 'hidden': Pushes it below screen (-22)
    // 'custom': Use specific value
    const POSITION_MODE = 'safe' as 'safe' | 'hidden' | 'custom';
    const CUSTOM_OFFSET = -22;

    const insets = useSafeAreaInsets();
    const TAB_BAR_HEIGHT = 50; // Standard Tab Bar Height
    const MARGIN_BOTTOM = 15;  // Extra spacing

    const finalBottomPosition = useDerivedValue(() => {
        if (POSITION_MODE === 'hidden') return CUSTOM_OFFSET;
        if (POSITION_MODE === 'safe') return insets.bottom + TAB_BAR_HEIGHT + MARGIN_BOTTOM;
        return CUSTOM_OFFSET;
    }, [insets.bottom]);

    // Internal animated progress for smoothness
    const animatedProgress = useSharedValue(0);

    // Sync with external progress using linear interpolation
    useAnimatedReaction(
        () => ({
            time: currentTime.value,
            dur: duration.value,
            scrubbing: isScrubbing.value
        }),
        (result, prevResult) => {
            // Safely update duration display state
            runOnJS(setDisplayDuration)(result.dur);

            if (result.dur <= 0) {
                animatedProgress.value = 0;
                return;
            }

            const targetProgress = result.time / result.dur;

            if (result.scrubbing) {
                // Instant update while scrubbing
                animatedProgress.value = targetProgress;
                return;
            }

            // Detect discontinuities (seek, loop, video change)
            // If prev was close to target, it's continuous playback
            let isContinuous = false;
            if (prevResult && prevResult.dur === result.dur) {
                const prevTarget = prevResult.time / prevResult.dur;
                if (Math.abs(targetProgress - prevTarget) < 0.05) {
                    isContinuous = true;
                }
            }

            if (isContinuous) {
                // Linear tween to next update point (33ms) to eliminate stutter
                animatedProgress.value = withTiming(targetProgress, {
                    duration: 33,
                    easing: Easing.linear
                });
            } else {
                // Jump instantly for seeks/resets
                animatedProgress.value = targetProgress;
            }
        }
    );

    const triggerHaptic = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const startScrubbing = useCallback(() => {
        setSeeking(true);
    }, [setSeeking]);

    const updateSeek = useCallback((percentage: number) => {
        if (duration.value > 0) {
            const seekTime = percentage * duration.value;
            onSeek(seekTime);
            // Update shared value immediately for UI feedback
            currentTime.value = seekTime;
        }
    }, [duration, onSeek, currentTime]);

    const endScrubbing = useCallback((percentage: number) => {
        if (duration.value > 0) {
            const seekTime = percentage * duration.value;
            onSeek(seekTime);
        }
        setSeeking(false);
    }, [duration, onSeek, setSeeking]);

    const pan = Gesture.Pan()
        .onBegin((event) => {
            'worklet';
            isScrubbing.value = true;
            thumbScale.value = withTiming(1, { duration: 150 });
            trackHeight.value = withTiming(TRACK_HEIGHT_EXPANDED, { duration: 150 });
            tooltipOpacity.value = withTiming(1, { duration: 150 });

            const absoluteX = event.absoluteX - HORIZONTAL_PADDING;
            const newProgress = Math.max(0, Math.min(absoluteX / BAR_WIDTH, 1));

            // Only update current time while scrubbing, not the actual video yet
            currentTime.value = newProgress * duration.value;

            runOnJS(setDisplayTime)(currentTime.value);
            runOnJS(startScrubbing)();
            runOnJS(triggerHaptic)();
        })
        .onUpdate((event) => {
            'worklet';
            const absoluteX = event.absoluteX - HORIZONTAL_PADDING;
            const newProgress = Math.max(0, Math.min(absoluteX / BAR_WIDTH, 1));

            currentTime.value = newProgress * duration.value;

            runOnJS(setDisplayTime)(currentTime.value);
        })
        .onEnd(() => {
            'worklet';
            isScrubbing.value = false;
            thumbScale.value = withTiming(1, { duration: 150 });
            trackHeight.value = withTiming(TRACK_HEIGHT, { duration: 150 });
            tooltipOpacity.value = withTiming(0, { duration: 150 });

            const finalProgress = currentTime.value / duration.value;
            runOnJS(endScrubbing)(finalProgress);
            runOnJS(triggerHaptic)();
        });

    const tap = Gesture.Tap()
        .onStart((event) => {
            'worklet';
            const absoluteX = event.absoluteX - HORIZONTAL_PADDING;
            const newProgress = Math.max(0, Math.min(absoluteX / BAR_WIDTH, 1));

            runOnJS(updateSeek)(newProgress);
            runOnJS(triggerHaptic)();
        });

    const composedGesture = Gesture.Race(pan, tap);

    const animatedTrackStyle = useAnimatedStyle(() => ({
        height: trackHeight.value,
        backgroundColor: interpolateColor(
            isScrubbing.value ? 1 : 0,
            [0, 1],
            ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.3)']
        ),
        borderRadius: trackHeight.value / 2,
    }));

    const animatedProgressStyle = useAnimatedStyle(() => {
        const dur = duration.value > 0 ? duration.value : 1;
        const time = currentTime.value;
        const isInteracting = isScrubbing.value;

        // Default opacity for "white"
        let opacity = 1;

        if (!isInteracting) {
            // First 1.5s fade in (0.15 -> 1)
            if (time < 1.5) {
                opacity = interpolate(time, [0, 1.5], [0.15, 1], Extrapolation.CLAMP);
            }
            // Last 1.5s fade out (1 -> 0.15)
            else if (time > dur - 1.5) {
                opacity = interpolate(time, [dur - 1.5, dur], [1, 0.15], Extrapolation.CLAMP);
            }
        }

        // Global opacity control (scrolling)
        let containerOpacity = opacity;
        if (isScrolling && isScrolling.value) {
            containerOpacity = 0;
        }

        return {
            width: `${animatedProgress.value * 100}%`,
            height: trackHeight.value,
            backgroundColor: isInteracting ? '#FFFFFF' : `rgba(255,255,255,${isInteracting ? 1 : opacity})`,
            borderRadius: trackHeight.value / 2,
        };
    });

    const containerAnimatedStyle = useAnimatedStyle(() => {
        if (isScrolling && isScrolling.value) {
            return { opacity: withTiming(0, { duration: 150 }) };
        }
        return { opacity: withTiming(1, { duration: 150 }) };
    });

    const thumbOpacity = useDerivedValue(() => {
        return withTiming(isScrubbing.value ? 1 : 0, { duration: 200 });
    });

    const animatedThumbStyle = useAnimatedStyle(() => ({
        opacity: thumbOpacity.value,
        transform: [
            { translateX: animatedProgress.value * BAR_WIDTH - THUMB_SIZE / 2 },
            { scale: thumbScale.value },
        ],
    }));

    const animatedTooltipStyle = useAnimatedStyle(() => {
        const leftPosition = animatedProgress.value * BAR_WIDTH;
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
        <Animated.View style={[styles.container, { bottom: finalBottomPosition }, containerAnimatedStyle]}>
            <Animated.View style={[styles.tooltip, animatedTooltipStyle]}>
                <View style={styles.tooltipContent}>
                    <Text style={styles.tooltipText}>
                        {formatTime(displayTime)} | {formatTime(displayDuration)}
                    </Text>
                </View>
            </Animated.View>

            <GestureDetector gesture={composedGesture}>
                <View style={styles.touchArea}>
                    <Animated.View style={[styles.track, animatedTrackStyle]} />
                    <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
                    <Animated.View style={[styles.thumb, animatedThumbStyle]} />
                </View>
            </GestureDetector>
        </Animated.View>
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
        // backgroundColor by animated style
    },
    progressFill: {
        position: 'absolute',
        left: 0,
        // backgroundColor by animated style
    },
    thumb: {
        position: 'absolute',
        top: (TOUCH_AREA_HEIGHT - THUMB_SIZE) / 2,
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
        // Opacity handled by animated style
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
});
