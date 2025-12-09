import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, Text, Dimensions, Animated as RNAnimated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
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
const BAR_WIDTH = SCREEN_WIDTH - (HORIZONTAL_PADDING * 2);

export function VideoSeekBar({
    currentTime,
    duration,
    onSeek,
    isActive = true
}: VideoSeekBarProps) {
    const setSeeking = useActiveVideoStore((state: ActiveVideoState) => state.setSeeking);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [displayTime, setDisplayTime] = useState(0);

    // Simple percentage calculation - no animation
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const triggerHaptic = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const handleSeek = useCallback((percentage: number) => {
        if (duration > 0) {
            onSeek(percentage * duration);
        }
    }, [duration, onSeek]);

    const pan = Gesture.Pan()
        .onBegin((event) => {
            'worklet';
        })
        .onStart(() => {
            setIsScrubbing(true);
            setSeeking(true);
            triggerHaptic();
        })
        .onUpdate((event) => {
            const absoluteX = event.absoluteX - HORIZONTAL_PADDING;
            const newProgress = Math.max(0, Math.min(absoluteX / BAR_WIDTH, 1));
            setDisplayTime(newProgress * (duration || 0));
        })
        .onEnd((event) => {
            const absoluteX = event.absoluteX - HORIZONTAL_PADDING;
            const newProgress = Math.max(0, Math.min(absoluteX / BAR_WIDTH, 1));
            handleSeek(newProgress);
            setIsScrubbing(false);
            setSeeking(false);
            triggerHaptic();
        });

    const tap = Gesture.Tap()
        .onStart((event) => {
            const absoluteX = event.absoluteX - HORIZONTAL_PADDING;
            const newProgress = Math.max(0, Math.min(absoluteX / BAR_WIDTH, 1));
            handleSeek(newProgress);
            triggerHaptic();
        });

    const composedGesture = Gesture.Race(pan, tap);

    if (!isActive) return null;

    return (
        <View style={[styles.container, { bottom: -18 }]}>
            <GestureDetector gesture={composedGesture}>
                <View style={styles.touchArea}>
                    {/* Track background */}
                    <View style={styles.track} />

                    {/* Progress fill - simple width percentage */}
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />

                    {/* Thumb - only visible when scrubbing */}
                    {isScrubbing && (
                        <View style={[
                            styles.thumb,
                            { left: (progress / 100) * BAR_WIDTH - THUMB_SIZE / 2 }
                        ]} />
                    )}
                </View>
            </GestureDetector>

            {/* Tooltip when scrubbing */}
            {isScrubbing && (
                <View style={[styles.tooltip, { left: Math.max(50, Math.min((progress / 100) * BAR_WIDTH, BAR_WIDTH - 50)) - 50 }]}>
                    <View style={styles.tooltipContent}>
                        <Text style={styles.tooltipText}>
                            {formatTime(displayTime)} | {formatTime(duration)}
                        </Text>
                    </View>
                </View>
            )}
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
        height: TRACK_HEIGHT,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
    },
    progressFill: {
        position: 'absolute',
        left: 0,
        height: TRACK_HEIGHT,
        backgroundColor: '#FFFFFF',
        borderRadius: 2,
    },
    thumb: {
        position: 'absolute',
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: '#FFFFFF',
        top: (TOUCH_AREA_HEIGHT - THUMB_SIZE) / 2,
    },
    tooltip: {
        position: 'absolute',
        bottom: TOUCH_AREA_HEIGHT + 8,
        width: 100,
        alignItems: 'center',
    },
    tooltipContent: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    tooltipText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
});
