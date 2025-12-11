import { useRef, useState, useEffect, useCallback, memo } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, ActivityIndicator } from 'react-native';
import Video, { OnProgressData, OnLoadData, VideoRef, OnVideoErrorData } from 'react-native-video';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import PlayIcon from '../../../../assets/icons/play.svg';
import ReplayIcon from '../../../../assets/icons/replay.svg';
import { useActiveVideoStore } from '../../store/useActiveVideoStore';
import * as Haptics from 'expo-haptics';
import { BrightnessOverlay } from './BrightnessOverlay';
import { RefreshCcw, AlertCircle, Maximize, Minimize } from 'lucide-react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { getBufferConfig } from '../../../core/utils/bufferConfig';
import { VideoSeekBar } from './VideoSeekBar';
import { useSharedValue, SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoCacheService } from '../../../data/services/VideoCacheService';
import { Image } from 'expo-image';

// Optional: Screen orientation (requires native build)
let ScreenOrientation: any = null;
try {
    ScreenOrientation = require('expo-screen-orientation');
} catch (e) {
    console.log('[VideoLayer] expo-screen-orientation not available (native build required)');
}

interface VideoLayerProps {
    video: VideoEntity;
    isActive: boolean;
    isMuted: boolean;
    onVideoEnd?: () => void;
    onProgressUpdate?: (progress: number, duration: number) => void;
    onSeekReady?: (seekFn: (time: number) => void) => void;
    isScrolling?: SharedValue<boolean>;
    onFullScreenPress?: () => void; // NEW: Expose fullscreen handler
    onResizeModeChange?: (mode: 'contain' | 'cover') => void; // NEW: Notify parent of resize mode
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
    isScrolling,
    onFullScreenPress, // NEW
    onResizeModeChange, // NEW
}: VideoLayerProps) {
    const isAppActive = useActiveVideoStore((state) => state.isAppActive);
    const isSeeking = useActiveVideoStore((state) => state.isSeeking);
    const isPausedGlobal = useActiveVideoStore((state) => state.isPaused);
    const setPaused = useActiveVideoStore((state) => state.setPaused);

    const { type: networkType } = useNetInfo();
    const defaultBufferConfig = getBufferConfig(networkType);

    const [isFinished, setIsFinished] = useState(false);
    const [duration, setDuration] = useState(0);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [key, setKey] = useState(0); // For forcing re-render implementation

    // Initial resizeMode based on pre-calculated dimensions
    const [resizeMode, setResizeMode] = useState<'cover' | 'contain' | 'stretch'>(() => {
        if (video.width && video.height) {
            return 'contain'; // Always contain if dimensions known
        }
        return 'contain'; // Default to contain
    });

    // Poster State (Manual Overlay)
    const [showPoster, setShowPoster] = useState(true);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Cache State - Try to get from memory cache synchronously first!
    const [videoSource, setVideoSource] = useState<any>(() => {
        try {
            if (typeof video.videoUrl === 'string') {
                const cached = VideoCacheService.getMemoryCachedPath(video.videoUrl);
                if (cached) {
                    return { uri: cached };
                }
                return { uri: video.videoUrl };
            }
            return video.videoUrl;
        } catch (e) {
            console.warn('[VideoLayer] Error reading memory cache:', e);
            return typeof video.videoUrl === 'string' ? { uri: video.videoUrl } : video.videoUrl;
        }
    });

    // Optimize buffer for local files
    const isLocal = videoSource?.uri?.startsWith('file://');
    const bufferConfig = isLocal ? {
        minBufferMs: 100, // Increased to match bufferForPlaybackAfterRebufferMs (50 < 100 was causing crash)
        maxBufferMs: 1000,
        bufferForPlaybackMs: 50,
        bufferForPlaybackAfterRebufferMs: 100
    } : defaultBufferConfig;

    // Local SharedValues for SeekBar
    const currentTimeSV = useSharedValue(0);
    const durationSV = useSharedValue(0);

    const videoRef = useRef<VideoRef>(null);
    const loopCount = useRef(0);

    // Check for cached version on mount/video change
    useEffect(() => {
        let isCancelled = false;

        const checkCache = async () => {
            if (typeof video.videoUrl === 'string') {
                const cachedPath = await VideoCacheService.getCachedVideoPath(video.videoUrl);
                if (cachedPath && !isCancelled) {
                    console.log('[VideoLayer] Playing from cache:', cachedPath);
                    setVideoSource({ uri: cachedPath });
                    // Also update key to force player reload if we switched source? 
                    // Usually react-native-video handles prop change, but sometimes it needs a kick.
                }
            }
        };

        // Reset to default
        setVideoSource(typeof video.videoUrl === 'string' ? { uri: video.videoUrl } : video.videoUrl);

        checkCache();

        return () => { isCancelled = true; };
    }, [video.videoUrl]);


    // Reset finished state if video changes
    useEffect(() => {
        setIsFinished(false);
        setHasError(false);
        setRetryCount(0);
        setKey(prev => prev + 1);
        loopCount.current = 0;
        currentTimeSV.value = 0;
        durationSV.value = 0;
    }, [video.id]);

    // Unlock orientation when component unmounts
    useEffect(() => {
        return () => {
            if (ScreenOrientation) {
                ScreenOrientation.unlockAsync?.();
            }
        };
    }, []);

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
        durationSV.value = data.duration;
        setHasError(false);
        setShowPoster(false); // Hide poster when video loads

        if (data.naturalSize) {
            const { width, height } = data.naturalSize;
            const orientation = width >= height ? 'landscape' : 'portrait';
            console.log(`[VideoLayer] Video loaded: ${width}x${height} (${orientation})`);
            const newMode = 'contain'; // Always contain to prevent cropping
            setResizeMode(newMode);
            onResizeModeChange?.(newMode); // Notify parent
        }
    }, [onResizeModeChange]);

    const handleVideoError = useCallback(async (error: OnVideoErrorData) => {
        console.error(`[VideoLayer] Error playing video ${video.id}:`, error);

        // Fallback Logic: Cache -> Network
        if (videoSource?.uri?.startsWith('file://')) {
            console.warn(`[VideoLayer] Cache file failed for ${video.id}. Deleting corrupt cache and falling back to Network.`);

            // Delete corrupt cache file
            await VideoCacheService.deleteCachedVideo(video.videoUrl);

            // Switch to network
            setVideoSource(typeof video.videoUrl === 'string' ? { uri: video.videoUrl } : video.videoUrl);
            setHasError(false);
            setKey(prev => prev + 1);
            return;
        }

        console.error(`[VideoLayer] Faulty URL:`, video.videoUrl);
        console.error(`[VideoLayer] Current Source:`, videoSource);
        setHasError(true);

        if (retryCount >= MAX_RETRIES) {
            console.log(`[VideoLayer] Max retries (${MAX_RETRIES}) reached.`);
        }
    }, [video.id, video.videoUrl, videoSource, retryCount]);

    const handleRetry = useCallback(() => {
        setRetryCount(prev => prev + 1);
        setHasError(false);
        setKey(prev => prev + 1); // Force re-mount of video component
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const handleProgress = useCallback((data: OnProgressData) => {
        onProgressUpdate?.(data.currentTime, duration);
        currentTimeSV.value = data.currentTime;
        if (duration > 0 && durationSV.value !== duration) {
            durationSV.value = duration;
        }
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

    // Reset to start when video becomes active (scrolled back)
    useEffect(() => {
        if (isActive) {
            if (!hasError) {
                loopCount.current = 0;
                setIsFinished(false);
                videoRef.current?.seek(0); // Reset video to start when becoming active
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
                source={videoSource}
                style={[styles.video, { backgroundColor: '#000' }]} // Black bg to prevent white flash
                resizeMode={resizeMode}
                // poster={video.thumbnailUrl} // Removed: Causes glitch (Start -> Thumb -> Start)
                // posterResizeMode={resizeMode}
                repeat={false}
                paused={!shouldPlay}
                muted={isMuted}
                bufferConfig={bufferConfig}
                onLoad={handleLoad} // Triggers fade out of manual poster
                onLoadStart={() => {
                    // Hide poster as soon as video starts loading to prevent conflicts
                    setShowPoster(false);
                }}
                onError={handleVideoError}
                onProgress={handleProgress}
                onEnd={handleEnd}
                playInBackground={false}
                playWhenInactive={false}
                ignoreSilentSwitch="ignore"
                progressUpdateInterval={33}
            />

            {/* Manual Poster Overlay (Only show before video starts loading) */}
            {showPoster && video.thumbnailUrl && (
                <Image
                    source={{ uri: video.thumbnailUrl }}
                    style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
                    contentFit="cover" // Always use cover for poster
                    priority="high"
                    cachePolicy="memory-disk"
                />
            )}

            {/* Brightness Overlay */}
            <BrightnessOverlay />

            {/* Gradient Overlay - moved here to be behind Seekbar */}
            <LinearGradient
                colors={['rgba(0,0,0,0.15)', 'transparent', 'transparent', 'rgba(0,0,0,0.5)']}
                locations={[0, 0.2, 0.6, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />

            {/* Error Overlay */}
            {hasError && (
                <View style={[styles.touchArea, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <View style={styles.errorContainer}>
                        <AlertCircle color="#EF4444" size={48} style={{ marginBottom: 12 }} />
                        <Text style={styles.errorText}>Video oynatılamadı</Text>
                        <Pressable style={styles.retryButton} onPress={handleRetry}>
                            <RefreshCcw color="#FFF" size={20} />
                            <Text style={styles.retryText}>Tekrar Dene</Text>
                        </Pressable>
                        {retryCount > 0 && (
                            <Text style={styles.retryCountText}>Deneme {retryCount}/{MAX_RETRIES}</Text>
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

            {/* Per-Video Seekbar */}
            <VideoSeekBar
                currentTime={currentTimeSV}
                duration={durationSV}
                isScrolling={isScrolling}
                onSeek={seekTo}
                isActive={isActive}
                spriteUrl={video.spriteUrl}
            />
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
    },
    fullScreenButton: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -60 }, { translateY: -20 }], // Half width/height
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
        zIndex: 50,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    fullScreenText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14
    }
});
