import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { ArrowRight, Minimize, Pause, Play } from 'lucide-react-native';

const TRACK_HEIGHT = 3;
const TRACK_BG = '#8E8E93';
const TRACK_FILL = '#FFFFFF';

interface SubtitlePreviewControlsProps {
    topOffset: number;
    isPlaying: boolean;
    currentTimeMs: number;
    totalDurationMs: number;
    onTogglePlayback: () => void;
    onSeek: (positionMs: number) => void;
    onMinimize: () => void;
    onContinueEditing: () => void;
    onNext: () => void;
}

const formatMs = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const SubtitlePreviewControls = ({
    topOffset,
    isPlaying,
    currentTimeMs,
    totalDurationMs,
    onTogglePlayback,
    onSeek,
    onMinimize,
    onContinueEditing,
    onNext,
}: SubtitlePreviewControlsProps) => {
    const barWidth = useSharedValue(0);
    const safeDuration = Math.max(1, totalDurationMs);
    const progress = Math.min(1, Math.max(0, currentTimeMs / safeDuration));
    const timeText = `${formatMs(currentTimeMs)} | ${formatMs(totalDurationMs)}`;

    const seekFromX = React.useCallback((x: number) => {
        const ratio = Math.min(1, Math.max(0, x / Math.max(1, barWidth.value)));
        onSeek(Math.round(ratio * safeDuration));
    }, [barWidth, onSeek, safeDuration]);

    const tapGesture = Gesture.Tap()
        .onEnd((e) => {
            'worklet';
            runOnJS(seekFromX)(e.x);
        });

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            'worklet';
            runOnJS(seekFromX)(e.x);
        });

    const seekGesture = Gesture.Race(tapGesture, panGesture);

    return (
        <View style={[styles.container, { top: topOffset }]}>
            <View style={styles.controlsRow}>
                <Pressable style={styles.playButton} onPress={onTogglePlayback} hitSlop={10}>
                    {isPlaying ? (
                        <Pause color="#FFFFFF" size={14} strokeWidth={2.2} fill="#FFFFFF" />
                    ) : (
                        <Play color="#FFFFFF" size={14} strokeWidth={2.2} fill="#FFFFFF" />
                    )}
                </Pressable>

                <GestureDetector gesture={seekGesture}>
                    <View
                        style={styles.seekBarHitArea}
                        onLayout={(e) => { barWidth.value = e.nativeEvent.layout.width; }}
                    >
                        <View style={styles.seekBarTrack}>
                            <View style={[styles.seekBarFill, { width: `${progress * 100}%` }]} />
                        </View>
                    </View>
                </GestureDetector>

                <Text style={styles.timeText}>{timeText}</Text>

                <Pressable style={styles.minimizeButton} onPress={onMinimize} hitSlop={10}>
                    <Minimize color="#FFFFFF" size={14} strokeWidth={2.2} />
                </Pressable>
            </View>

            <View style={styles.actionsRow}>
                <Pressable style={styles.actionButton} onPress={onContinueEditing}>
                    <Text style={styles.actionText}>Düzenlemeye Devam Et</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.actionButtonRight]} onPress={onNext}>
                    <Text style={styles.actionText}>İleri</Text>
                    <ArrowRight color="#FFFFFF" size={18} strokeWidth={2.5} />
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 10002,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 32,
        gap: 12,
    },
    playButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    seekBarHitArea: {
        flex: 1,
        height: 24,
        justifyContent: 'center',
    },
    seekBarTrack: {
        height: TRACK_HEIGHT,
        borderRadius: TRACK_HEIGHT / 2,
        backgroundColor: TRACK_BG,
        overflow: 'hidden',
    },
    seekBarFill: {
        height: '100%',
        borderRadius: TRACK_HEIGHT / 2,
        backgroundColor: TRACK_FILL,
    },
    timeText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.2,
        fontVariant: ['tabular-nums'],
    },
    minimizeButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionButtonRight: {
        marginLeft: 'auto',
    },
    actionText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
