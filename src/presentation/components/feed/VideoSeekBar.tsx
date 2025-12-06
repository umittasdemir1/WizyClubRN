import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions } from 'react-native';
import { VideoPlayer } from 'expo-video';

interface VideoSeekBarProps {
    player: VideoPlayer;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const PADDING_H = 16;
const BAR_WIDTH = SCREEN_WIDTH - (PADDING_H * 2);

export function VideoSeekBar({ player }: VideoSeekBarProps) {
    const [seekTime, setSeekTime] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Progress Animated Value (0-100)
    const progress = useRef(new Animated.Value(0)).current;

    // Refs for logic without re-renders
    const wasPlayingRef = useRef(false);

    // Format time: 85 -> "1:25"
    const formatTime = (seconds: number): string => {
        if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // 1. Auto-update Logic (setInterval)
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isDragging && player.duration > 0) {
                const percentage = (player.currentTime / player.duration) * 100;
                // Smooth update
                Animated.timing(progress, {
                    toValue: percentage,
                    duration: 100, // Sync with interval
                    useNativeDriver: false,
                }).start();
            }
        }, 100);

        return () => clearInterval(interval);
    }, [player, isDragging]);

    // 2. Touch Handling (Simple View Events)
    const handleTouchStart = () => {
        setIsDragging(true);
        wasPlayingRef.current = player.playing;
        if (player.playing) player.pause();
    };

    const handleTouchMove = (e: any) => {
        const pageX = e.nativeEvent.pageX;
        updatePosition(pageX);
    };

    const handleTouchEnd = (e: any) => {
        setIsDragging(false);
        const pageX = e.nativeEvent.pageX;

        // Final Seek
        if (player.duration > 0) {
            const relativeX = pageX - PADDING_H;
            const clampedX = Math.max(0, Math.min(relativeX, BAR_WIDTH));
            const percentage = (clampedX / BAR_WIDTH) * 100;
            const newTime = (percentage / 100) * player.duration;

            player.seekBy(newTime - player.currentTime);
            if (wasPlayingRef.current) player.play();
        }

        setSeekTime(null);
    };

    const updatePosition = (pageX: number) => {
        const relativeX = pageX - PADDING_H;
        const clampedX = Math.max(0, Math.min(relativeX, BAR_WIDTH));
        const percentage = (clampedX / BAR_WIDTH) * 100;

        progress.setValue(percentage);

        if (player.duration > 0) {
            const newTime = (percentage / 100) * player.duration;
            setSeekTime(newTime);
        }
    };

    return (
        <View
            style={styles.container}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* 1. Track */}
            <View style={styles.track} />

            {/* 2. Progress Fill */}
            <Animated.View
                style={[
                    styles.progressFill,
                    {
                        width: progress.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%']
                        })
                    }
                ]}
            />

            {/* 3. Thumb */}
            <Animated.View
                style={[
                    styles.thumb,
                    {
                        left: progress.interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%']
                        })
                    }
                ]}
            />

            {/* TOOLTIP */}
            {isDragging && seekTime !== null && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipText}>
                        {`${formatTime(seekTime)} | ${formatTime(player.duration)}`}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 60, // User requested 60
        left: 16,
        right: 16,
        zIndex: 40,
        height: 24, // Touch area
        justifyContent: 'center',
    },
    track: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 999,
    },
    progressFill: {
        position: 'absolute',
        left: 0,
        height: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 999,
    },
    thumb: {
        position: 'absolute',
        width: 14,
        height: 14,
        backgroundColor: '#FFFFFF',
        borderRadius: 7,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        transform: [{ translateX: -7 }, { translateY: -7 }], // Center thumb vertically/horizontally
        top: '50%', // Absolute positioning trick
    },
    tooltip: {
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    tooltipText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
