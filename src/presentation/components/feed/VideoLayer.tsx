import { useRef, useState, useEffect, useCallback, memo } from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
import Video, { OnProgressData, OnLoadData, VideoRef } from 'react-native-video';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import PlayIcon from '../../../../assets/icons/play.svg';
import ReplayIcon from '../../../../assets/icons/replay.svg';
import { useActiveVideoStore } from '../../store/useActiveVideoStore';
import * as Haptics from 'expo-haptics';
import { BrightnessOverlay } from './BrightnessOverlay';

interface VideoLayerProps {
    video: VideoEntity;
    isActive: boolean;
    isMuted: boolean;
    onVideoEnd?: () => void;
    onProgressUpdate?: (progress: number, duration: number) => void;
    onSeekReady?: (seekFn: (time: number) => void) => void;
}

const MAX_LOOPS = 2;

// 🚀 OPTIMIZED BUFFER CONFIG (Reactive Native Video)
const BUFFER_CONFIG = {
    minBufferMs: 2000,
    maxBufferMs: 10000,
    bufferForPlaybackMs: 250,
    bufferForPlaybackAfterRebufferMs: 500,
};

export const VideoLayer = memo(function VideoLayer({
    video,
    isActive,
    isMuted,
    onVideoEnd,
    onProgressUpdate,
    onSeekReady,
}: VideoLayerProps) {
    const isAppActive = useActiveVideoStore((state) => state.isAppActive);
    const isSeeking = useActiveVideoStore((state) => state.isSeeking);
    const isPausedGlobal = useActiveVideoStore((state) => state.isPaused);
    const setPaused = useActiveVideoStore((state) => state.setPaused);

    const [isFinished, setIsFinished] = useState(false);
    const [duration, setDuration] = useState(0);

    const videoRef = useRef<VideoRef>(null);
    const loopCount = useRef(0);

    // Reset finished state if video changes
    useEffect(() => {
        setIsFinished(false);
        loopCount.current = 0;
    }, [video.id]);

    // Handle Global Pause Toggle for Replay
    useEffect(() => {
        // If unpaused and was finished, restart
        if (!isPausedGlobal && isFinished && isActive) {
            setIsFinished(false);
            loopCount.current = 0;
            videoRef.current?.seek(0);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    }, [isPausedGlobal, isFinished, isActive]);

    const shouldPlay = isActive && isAppActive && !isSeeking && !isPausedGlobal && !isFinished;

    const handleLoad = useCallback((data: OnLoadData) => {
        setDuration(data.duration);
    }, []);

    const handleProgress = useCallback((data: OnProgressData) => {
        onProgressUpdate?.(data.currentTime, duration);
    }, [duration, onProgressUpdate]);

    const handleEnd = useCallback(() => {
        loopCount.current += 1;
        if (loopCount.current >= MAX_LOOPS) {
            setIsFinished(true);
            setPaused(true); // Show replay icon logic effectively
            onVideoEnd?.();
        } else {
            videoRef.current?.seek(0);
        }
    }, [onVideoEnd, setPaused]);

    const seekTo = useCallback((time: number) => {
        videoRef.current?.seek(time);
        if (isFinished) {
            setIsFinished(false);
            setPaused(false);
        }
    }, [isFinished, setPaused]);

    // Reset loop & seek on active
    useEffect(() => {
        if (isActive) {
            loopCount.current = 0;
            setIsFinished(false);
            videoRef.current?.seek(0);
            onSeekReady?.(seekTo);
        }
    }, [isActive, seekTo, onSeekReady]);

    // Icons
    const showPlayIcon = isPausedGlobal && !isSeeking && isActive && !isFinished;
    const showReplayIcon = isFinished && isActive;

    // Handle tap to pause/play
    const handleTap = useCallback(() => {
        if (isFinished) {
            // Replay
            setIsFinished(false);
            loopCount.current = 0;
            setPaused(false);
            videoRef.current?.seek(0);
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
        } else {
            // Toggle pause
            const togglePause = useActiveVideoStore.getState().togglePause;
            togglePause();
            if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        }
    }, [isFinished, setPaused]);

    return (
        <View style={styles.container}>
            <Video
                ref={videoRef}
                source={typeof video.videoUrl === 'string'
                    ? { uri: video.videoUrl }
                    : video.videoUrl}
                style={styles.video}
                resizeMode="cover"
                poster={video.thumbnailUrl}
                posterResizeMode="cover"
                repeat={false}
                paused={!shouldPlay}
                muted={isMuted}
                bufferConfig={BUFFER_CONFIG}
                onLoad={handleLoad}
                onProgress={handleProgress}
                onEnd={handleEnd}
                playInBackground={false}
                playWhenInactive={false}
                ignoreSilentSwitch="ignore"
                progressUpdateInterval={33}
            />

            {/* Brightness Overlay */}
            <BrightnessOverlay />

            {/* Icons overlay - tap handled by DoubleTapLike */}
            <View style={styles.touchArea} pointerEvents="none">
                {showPlayIcon && (
                    <View style={styles.iconContainer}>
                        <View style={styles.iconBackground}>
                            <PlayIcon width={32} height={32} color="#FFFFFF" />
                        </View>
                    </View>
                )}
                {showReplayIcon && (
                    <View style={styles.iconContainer}>
                        <View style={styles.iconBackground}>
                            <ReplayIcon width={32} height={32} color="#FFFFFF" />
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}, (prev, next) => {
    return (
        prev.video.id === next.video.id &&
        prev.isActive === next.isActive &&
        prev.isMuted === next.isMuted
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        paddingVertical: 25, // 25px top and bottom
    },
    video: {
        flex: 1, // Respects container padding for black bars
    },
    touchArea: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBackground: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
