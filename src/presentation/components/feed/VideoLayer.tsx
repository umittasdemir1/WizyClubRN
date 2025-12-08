import { useRef, useState, useEffect, useCallback, memo, useMemo } from 'react';
import { StyleSheet, View, Pressable, Platform, Text, ActivityIndicator } from 'react-native';
import Video, { OnProgressData, OnLoadData, VideoRef, OnVideoErrorData } from 'react-native-video';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import PlayIcon from '../../../../assets/icons/play.svg';
import ReplayIcon from '../../../../assets/icons/replay.svg';
import { useActiveVideoStore } from '../../store/useActiveVideoStore';
import * as Haptics from 'expo-haptics';
import { BrightnessOverlay } from './BrightnessOverlay';
import { useNetInfo } from '@react-native-community/netinfo';

interface VideoLayerProps {
    video: VideoEntity;
    isActive: boolean;
    isMuted: boolean;
    onVideoEnd?: () => void;
    onProgressUpdate?: (progress: number, duration: number) => void;
    onSeekReady?: (seekFn: (time: number) => void) => void;
}

const MAX_LOOPS = 2;

// 🚀 ADAPTIVE BUFFER CONFIG based on network type
const getBufferConfig = (connectionType: string | null) => {
    switch (connectionType) {
        case 'wifi':
            // WiFi: Aggressive buffering for seamless playback
            return {
                minBufferMs: 2000,
                maxBufferMs: 60000, // 60 seconds
                bufferForPlaybackMs: 250,
                bufferForPlaybackAfterRebufferMs: 500,
            };
        case 'cellular':
            // 4G/5G: Balanced buffering
            return {
                minBufferMs: 2500,
                maxBufferMs: 10000,
                bufferForPlaybackMs: 300,
                bufferForPlaybackAfterRebufferMs: 600,
            };
        default:
            // Slow/Unknown: Conservative buffering for quick start
            return {
                minBufferMs: 3000,
                maxBufferMs: 6000,
                bufferForPlaybackMs: 500,
                bufferForPlaybackAfterRebufferMs: 800,
            };
    }
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
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const videoRef = useRef<VideoRef>(null);
    const loopCount = useRef(0);

    // Network-aware buffer config
    const netInfo = useNetInfo();
    const bufferConfig = useMemo(() => {
        return getBufferConfig(netInfo.type);
    }, [netInfo.type]);

    // Reset finished state if video changes
    useEffect(() => {
        setIsFinished(false);
        setHasError(false);
        setRetryCount(0);
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

    const handleError = useCallback((error: OnVideoErrorData) => {
        console.error('Video error:', error);
        setHasError(true);

        // Auto retry up to 3 times
        if (retryCount < 3) {
            setTimeout(() => {
                setRetryCount(prev => prev + 1);
                setHasError(false);
            }, 1500); // Slightly longer delay for better UX
        } else {
            // After 3 failed attempts, skip to next video
            console.warn('Video failed after 3 attempts, skipping...');
            onVideoEnd?.();
        }
    }, [retryCount, onVideoEnd]);

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
                bufferConfig={bufferConfig}
                onLoad={handleLoad}
                onProgress={handleProgress}
                onEnd={handleEnd}
                onError={handleError}
                playInBackground={false}
                playWhenInactive={false}
                ignoreSilentSwitch="ignore"
                progressUpdateInterval={isSeeking ? 50 : 250}
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

            {/* Loading Overlay */}
            {hasError && isActive && retryCount < 3 && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.loadingText}>Video hazırlanıyor...</Text>
                </View>
            )}
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
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    loadingText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 12,
        opacity: 0.9,
    },
});
