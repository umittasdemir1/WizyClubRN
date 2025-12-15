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
import { VideoSeekBar } from './VideoSeekBar';
import { useSharedValue, SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoCacheService } from '../../../data/services/VideoCacheService';
import { Image } from 'expo-image';
import { PerformanceLogger } from '../../../core/services/PerformanceLogger';

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
    onResizeModeChange, // NEW
}: VideoLayerProps) {
    const isAppActive = useActiveVideoStore((state) => state.isAppActive);
    const isScreenFocused = useActiveVideoStore((state) => state.isScreenFocused);
    const isSeeking = useActiveVideoStore((state) => state.isSeeking);
    const isPausedGlobal = useActiveVideoStore((state) => state.isPaused);
    const setPaused = useActiveVideoStore((state) => state.setPaused);

    // Debug Pause Logic
    useEffect(() => {
        if (isActive) {
            console.log(`[VideoLayer] ${video.id} State Update:`, {
                isActive,
                isAppActive,
                isScreenFocused,
                isPausedGlobal,
                shouldPlay: isActive && isAppActive && isScreenFocused && !isSeeking && !isPausedGlobal && !isFinished && !hasError
            });
        }
    }, [isActive, isAppActive, isScreenFocused, isPausedGlobal]);

    const { type: networkType } = useNetInfo();
    const defaultBufferConfig = getBufferConfig(networkType);

    const [isFinished, setIsFinished] = useState(false);
    // ... (unchanged lines)
    // ...
    // ...
    // ...

    // ... skipping directly to shouldPlay
    const [duration, setDuration] = useState(0);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [key, setKey] = useState(0); // For forcing re-render implementation

    const shouldPlay = isActive && isAppActive && isScreenFocused && !isSeeking && !isPausedGlobal && !isFinished && !hasError;

    const resizeMode: 'contain' = 'contain';

    // Poster State (Manual Overlay)
    const [showPoster, setShowPoster] = useState(true);

    // Cache-First Strategy: Don't set source until we check cache
    const [videoSource, setVideoSource] = useState<any>(null);
    const [isSourceReady, setIsSourceReady] = useState(false);

    // Optimize buffer based on source type (Faz 5 + HLS optimization)
    const isLocal = videoSource?.uri?.startsWith('file://');
    const isHLS = typeof video.videoUrl === 'string' && video.videoUrl.endsWith('.m3u8');

    const bufferConfig = isLocal
        ? {
            // Local files: smaller buffer for disk I/O
            minBufferMs: 250,
            maxBufferMs: 2000,
            bufferForPlaybackMs: 100,
            bufferForPlaybackAfterRebufferMs: 250
        }
        : isHLS
            ? {
                // HLS: larger buffer for segment streaming
                minBufferMs: 3000,
                maxBufferMs: 15000,
                bufferForPlaybackMs: 1000,
                bufferForPlaybackAfterRebufferMs: 2000
            }
            : defaultBufferConfig;

    // Local SharedValues for SeekBar
    const currentTimeSV = useSharedValue(0);
    const durationSV = useSharedValue(0);

    const videoRef = useRef<VideoRef>(null);
    const loopCount = useRef(0);
    const memoryCachedRef = useRef(false); // Track if loaded from memory cache

    // Cache-First Strategy: Check cache BEFORE setting source
    useEffect(() => {
        let isCancelled = false;

        const initVideoSource = async () => {
            if (typeof video.videoUrl !== 'string') {
                setVideoSource(video.videoUrl);
                setIsSourceReady(true);
                return;
            }

            // STEP 1: Memory cache (synchronous, instant)
            const memoryCached = VideoCacheService.getMemoryCachedPath(video.videoUrl);
            if (memoryCached && !isCancelled) {
                // For HLS, memory cache returns the original URL (prefetch marker)
                const isHLS = video.videoUrl.endsWith('.m3u8');
                console.log(
                    isHLS
                        ? '[VideoLayer] 📺 HLS prefetched (native cache):'
                        : '[VideoLayer] 🚀 Memory cache HIT:',
                    video.id
                );
                memoryCachedRef.current = !isHLS; // Only true for actual file cache, not HLS
                setVideoSource({ uri: memoryCached });
                setIsSourceReady(true);
                // Don't call endTransition here - wait for onLoad!
                return;
            }

            // STEP 2: Disk cache (async, fast)
            const diskCached = await VideoCacheService.getCachedVideoPath(video.videoUrl);
            if (diskCached && !isCancelled) {
                console.log('[VideoLayer] ⚡ Disk cache HIT:', video.id);
                memoryCachedRef.current = false;
                setVideoSource({ uri: diskCached });
                setIsSourceReady(true);
                // Don't call endTransition here - wait for onLoad!
                return;
            }

            // STEP 3: Network fallback (slow)
            if (!isCancelled) {
                console.log('[VideoLayer] 🌐 Network MISS:', video.id);
                memoryCachedRef.current = false;
                setVideoSource({ uri: video.videoUrl });
                setIsSourceReady(true);
                // Don't call endTransition here - wait for onLoad!
            }
        };

        // Reset states
        setIsSourceReady(false);
        setShowPoster(true);
        memoryCachedRef.current = false;

        // Initialize source with cache-first strategy
        initVideoSource();

        return () => { isCancelled = true; };
    }, [video.id]); // Use video.id instead of video.videoUrl for stability


    // Reset finished state if video changes (NO KEY INCREMENT - Faz 4 optimization)
    useEffect(() => {
        setIsFinished(false);
        setHasError(false);
        setRetryCount(0);
        // setKey(prev => prev + 1); // REMOVED: Prevents unnecessary remount
        loopCount.current = 0;
        currentTimeSV.value = 0;
        durationSV.value = 0;
        videoRef.current?.seek(0); // Use seek instead of remount
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

    // shouldPlay logic moved to top of component to include isScreenFocused
    // const shouldPlay = isActive && isAppActive && !isSeeking && !isPausedGlobal && !isFinished && !hasError;

    const handleLoad = useCallback((data: OnLoadData) => {
        setDuration(data.duration);
        durationSV.value = data.duration;
        setHasError(false);
        setShowPoster(false); // Hide poster when video loads

        // Performance: Track actual load time (from mount to first frame ready)
        const source = videoSource?.uri?.startsWith('file://')
            ? 'disk-cache'
            : isHLS
                ? 'network'
                : memoryCachedRef.current
                    ? 'memory-cache'
                    : 'network';

        PerformanceLogger.endTransition(video.id, source);

        if (data.naturalSize) {
            const { width, height } = data.naturalSize;
            const orientation = width >= height ? 'landscape' : 'portrait';
            console.log(`[VideoLayer] Video loaded: ${width}x${height} (${orientation})`);
            const newMode = 'contain'; // Always contain to prevent cropping
            onResizeModeChange?.(newMode); // Notify parent
        }
    }, [onResizeModeChange, video.id, videoSource, isHLS]);

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
            {/* Only render Video component when source is ready */}
            {isSourceReady && videoSource && (
                <Video
                    key={key}
                    ref={videoRef}
                    source={videoSource}
                    style={[styles.video, { backgroundColor: '#000' }]} // Black bg to prevent white flash
                    resizeMode={resizeMode}
                    // poster={video.thumbnailUrl} // Removed: Causes glitch (Start -> Thumb -> Start)
                    // posterResizeMode={resizeMode}
                    repeat={false}
                    controls={false} // FIX: Hide ghost native controls
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
                    // HLS optimizations
                    automaticallyWaitsToMinimizeStalling={true}
                    preventsDisplaySleepDuringVideoPlayback={true}
                />
            )}

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
    },
    video: {
        flex: 1,
        width: '100%', // Yan boşlukları kaldırmak için tam genişlik
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
