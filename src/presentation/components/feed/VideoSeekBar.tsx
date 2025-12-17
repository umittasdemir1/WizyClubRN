import React, { useState, useCallback } from 'react';
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
import { SpritePreview } from './SpritePreview';

// Usage Configuration
import { useWindowDimensions } from 'react-native';

// Usage Configuration
const HORIZONTAL_PADDING = 0;
const TOUCH_AREA_HEIGHT = 80;
const THUMB_SIZE = 12; // Height of the vertical bar
const THUMB_WIDTH = 2; // Width of the vertical bar
const TRACK_HEIGHT = 2;
const TRACK_HEIGHT_EXPANDED = 4; // Slimmer track expansion
const TOOLTIP_WIDTH = 100;
const TOOLTIP_HALF_WIDTH = TOOLTIP_WIDTH / 2;
const TOOLTIP_SCREEN_MARGIN = 16;

interface VideoSeekBarProps {
    currentTime: SharedValue<number>;
    duration: SharedValue<number>;
    isScrolling?: SharedValue<boolean>;
    onSeek: (time: number) => void;
    isActive?: boolean;
    spriteUrl?: string;
    bottomOffset?: number;
}

export function VideoSeekBar({
    currentTime,
    duration,
    isScrolling,
    onSeek,
    isActive = true,
    spriteUrl,
    bottomOffset
}: VideoSeekBarProps) {
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const BAR_WIDTH = SCREEN_WIDTH - (HORIZONTAL_PADDING * 2);

    const setSeeking = useActiveVideoStore((state: ActiveVideoState) => state.setSeeking);
    const [displayTime, setDisplayTime] = useState(0);

    const isScrubbing = useSharedValue(false);
    const thumbScale = useSharedValue(1);
    const trackHeight = useSharedValue(TRACK_HEIGHT);
    const tooltipOpacity = useSharedValue(0);

    const POSITION_MODE = 'safe' as 'safe' | 'hidden' | 'custom';
    const CUSTOM_OFFSET = -22;

    const insets = useSafeAreaInsets();
    const TAB_BAR_HEIGHT = 0; // Resetting to 0 to find the true baseline
    const MARGIN_BOTTOM = 0;

    const finalBottomPosition = useDerivedValue(() => {
        if (bottomOffset !== undefined) return bottomOffset;
        if (POSITION_MODE === 'hidden') return CUSTOM_OFFSET;
        if (POSITION_MODE === 'safe') return TAB_BAR_HEIGHT + MARGIN_BOTTOM; // Strictly bottom: 0
        return CUSTOM_OFFSET;
    }, [bottomOffset]);

    const animatedProgress = useSharedValue(0);

    useAnimatedReaction(
        () => ({
            time: currentTime.value,
            dur: duration.value,
            scrubbing: isScrubbing.value
        }),
        (result, prevResult) => {
            if (result.dur <= 0) {
                animatedProgress.value = 0;
                return;
            }

            const targetProgress = result.time / result.dur;

            if (result.scrubbing) {
                animatedProgress.value = targetProgress;
                return;
            }

            let isContinuous = false;
            if (prevResult && prevResult.dur === result.dur) {
                const prevTarget = prevResult.time / prevResult.dur;
                if (Math.abs(targetProgress - prevTarget) < 0.05) {
                    isContinuous = true;
                }
            }

            if (isContinuous) {
                animatedProgress.value = withTiming(targetProgress, {
                    duration: 33,
                    easing: Easing.linear
                });
            } else {
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
        //.activateAfterLongPress(200) // Removed for immediate response
        .activeOffsetX([-10, 10]) // Require small movement to start pan (prevents accidental tiny swipes)
        .onStart((event) => {
            'worklet';
            isScrubbing.value = true;
            thumbScale.value = withTiming(1.3, { duration: 150 }); // Scale up thumb slightly
            trackHeight.value = withTiming(TRACK_HEIGHT_EXPANDED, { duration: 150 });
            tooltipOpacity.value = withTiming(1, { duration: 150 });

            const absoluteX = event.absoluteX - HORIZONTAL_PADDING;
            const newProgress = Math.max(0, Math.min(absoluteX / BAR_WIDTH, 1));
            currentTime.value = newProgress * duration.value;

            runOnJS(startScrubbing)();
            runOnJS(triggerHaptic)();
        })
        .onUpdate((event) => {
            'worklet';
            const absoluteX = event.absoluteX - HORIZONTAL_PADDING;
            const newProgress = Math.max(0, Math.min(absoluteX / BAR_WIDTH, 1));
            currentTime.value = newProgress * duration.value;
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
        })
        .onFinalize(() => {
            'worklet';
            if (isScrubbing.value) {
                isScrubbing.value = false;
                thumbScale.value = withTiming(1, { duration: 150 });
                trackHeight.value = withTiming(TRACK_HEIGHT, { duration: 150 });
                tooltipOpacity.value = withTiming(0, { duration: 150 });
                runOnJS(setSeeking)(false);
            }
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
        let opacity = 1;

        if (!isInteracting) {
            if (time < 1.5) {
                opacity = interpolate(time, [0, 1.5], [0.15, 1], Extrapolation.CLAMP);
            } else if (time > dur - 1.5) {
                opacity = interpolate(time, [dur - 1.5, dur], [1, 0.15], Extrapolation.CLAMP);
            }
        }

        if (isScrolling && isScrolling.value) {
            opacity = 0;
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
            { translateX: animatedProgress.value * BAR_WIDTH - THUMB_WIDTH / 2 },
            { scaleY: thumbScale.value },
        ],
    }));

    const animatedTooltipStyle = useAnimatedStyle(() => {
        // Calculate visual center in screen coordinates
        const thumbScreenX = HORIZONTAL_PADDING + (animatedProgress.value * BAR_WIDTH);

        // Clamp center so tooltip doesn't overflow screen
        // Min X = TOOLTIP_HALF_WIDTH + MARGIN (left edge limit)
        // Max X = SCREEN_WIDTH - TOOLTIP_HALF_WIDTH - MARGIN (right edge limit)
        const minX = TOOLTIP_HALF_WIDTH + TOOLTIP_SCREEN_MARGIN;
        const maxX = SCREEN_WIDTH - TOOLTIP_HALF_WIDTH - TOOLTIP_SCREEN_MARGIN;

        const clampedScreenX = Math.max(minX, Math.min(thumbScreenX, maxX));

        return {
            opacity: tooltipOpacity.value,
            transform: [
                { translateX: clampedScreenX - TOOLTIP_HALF_WIDTH }, // Shift so center aligns with clampedScreenX
                { scale: thumbScale.value },
            ],
        };
    });

    return (
        <Animated.View style={[styles.container, { bottom: finalBottomPosition }, containerAnimatedStyle]}>
            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.touchArea, { height: TOUCH_AREA_HEIGHT }]}>
                    <View style={[styles.trackContainer, { width: BAR_WIDTH }]}>
                        <Animated.View style={[styles.trackBackground, animatedTrackStyle]}>
                            <Animated.View style={[styles.progressFill, animatedProgressStyle]} />
                        </Animated.View>
                        <Animated.View style={[styles.thumb, animatedThumbStyle]} />
                    </View>
                </Animated.View>
            </GestureDetector>

            <Animated.View style={[styles.tooltipContainer, animatedTooltipStyle]}>
                {spriteUrl && (
                    <SpritePreview
                        spriteUrl={spriteUrl}
                        sharedTime={currentTime} // Pass SharedValue directly for 60fps
                        frameWidth={100}
                        frameHeight={180}
                    />
                )}
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 100,
    },
    touchArea: {
        width: '100%',
        justifyContent: 'center',
        backgroundColor: 'transparent', // Ensure clicks are caught
    },
    trackContainer: {
        alignSelf: 'center',
        justifyContent: 'center',
    },
    trackBackground: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.3)',
        overflow: 'hidden',
    },
    progressFill: {
        backgroundColor: '#FFFFFF',
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
    },
    thumb: {
        position: 'absolute',
        left: 0,
        width: THUMB_WIDTH,
        height: THUMB_SIZE,
        borderRadius: THUMB_WIDTH / 2,
        backgroundColor: '#FFFFFF',
        // No shadows for the line indicator for a cleaner look
    },
    tooltipContainer: {
        position: 'absolute',
        left: 0, // Force left alignment for predictable transforms
        bottom: 80, // Moved UP from 55
        width: TOOLTIP_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
});
