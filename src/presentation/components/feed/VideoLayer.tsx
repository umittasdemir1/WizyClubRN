import { useRef, useState, useEffect, useCallback, memo } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, ActivityIndicator } from 'react-native';
import Video, { OnProgressData, OnLoadData, VideoRef, OnVideoErrorData } from 'react-native-video';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import PlayIcon from '../../../../assets/icons/play.svg';
import ReplayIcon from '../../../../assets/icons/replay.svg';
import { useActiveVideoStore } from '../../store/useActiveVideoStore';
import * as Haptics from 'expo-haptics';
import { BrightnessOverlay } from './BrightnessOverlay';
import { RefreshCcw, AlertCircle } from 'lucide-react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { getBufferConfig } from '../../../core/utils/bufferConfig';

interface VideoLayerProps {
    video: VideoEntity;
    isActive: boolean;
    isMuted: boolean;
    onVideoEnd?: () => void;
    onProgressUpdate?: (progress: number, duration: number) => void;
    onSeekReady?: (seekFn: (time: number) => void) => void;
}

const MAX_LOOPS = 2;
const MAX_RETRIES = 3;

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

    const { type: networkType } = useNetInfo();
    const bufferConfig = getBufferConfig(networkType);

    const [isFinished, setIsFinished] = useState(false);
    const [duration, setDuration] = useState(0);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [key, setKey] = useState(0); // For forcing re-render implementation

    const videoRef = useRef<VideoRef>(null);
    const loopCount = useRef(0);

    // Reset finished state if video changes
    useEffect(() => {
        setIsFinished(false);
        setHasError(false);
        setRetryCount(0);
        setKey(prev => prev + 1);
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

    const shouldPlay = isActive && isAppActive && !isSeeking && !isPausedGlobal && !isFinished && !hasError;

    const handleLoad = useCallback((data: OnLoadData) => {
        setDuration(data.duration);
        setHasError(false);
    }, []);

    const handleVideoError = useCallback((error: OnVideoErrorData) => {
        console.error(`[VideoLayer] Error playing video ${video.id}:`, error);
        setHasError(true);

        if (retryCount >= MAX_RETRIES) {
            console.log(`[VideoLayer] Max retries (${MAX_RETRIES}) reached, skipping video.`);
            onVideoEnd?.(); // Auto-skip
        }
    }, [video.id, retryCount, onVideoEnd]);

    const handleRetry = useCallback(() => {
        setRetryCount(prev => prev + 1);
        setHasError(false);
        setKey(prev => prev + 1); // Force re-mount of video component
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            if (!hasError) {
                loopCount.current = 0;
                setIsFinished(false);
                // videoRef.current?.seek(0); // Optional: reset to start when becoming active
            }
            onSeekReady?.(seekTo);
        }
    }, [isActive, seekTo, onSeekReady, hasError]);

    // Icons
    const showPlayIcon = isPausedGlobal && !isSeeking && isActive && !isFinished && !hasError;
    const showReplayIcon = isFinished && isActive && !hasError;

    return (
        <View style={styles.container}>
            <Video
                key={key}
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
                onError={handleVideoError}
                onProgress={handleProgress}
                onEnd={handleEnd}
                playInBackground={false}
                playWhenInactive={false}
                ignoreSilentSwitch="ignore"
                progressUpdateInterval={isActive && isSeeking ? 50 : 250}
            />

            {/* Brightness Overlay */}
            <BrightnessOverlay />

            {/* Error Overlay */}
            {hasError && (
                <View style={[styles.touchArea, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <View style={styles.errorContainer}>
                        <AlertCircle color="#EF4444" size={48} style={{ marginBottom: 12 }} />
                        <Text style={styles.errorText}>Video failed to load</Text>
                        <Pressable style={styles.retryButton} onPress={handleRetry}>
                            <RefreshCcw color="#FFF" size={20} />
                            <Text style={styles.retryText}>Retry</Text>
                        </Pressable>
                        {retryCount > 0 && (
                            <Text style={styles.retryCountText}>Attempt {retryCount}/{MAX_RETRIES}</Text>
                        )}
                    </View>
                </View>
            )}

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
        prev.isMuted === next.isMuted &&
        true
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
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)'
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    retryCountText: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 12,
    }
});
