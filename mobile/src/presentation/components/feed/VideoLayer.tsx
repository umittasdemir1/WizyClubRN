import { useRef, useState, useEffect, useCallback, memo } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, ActivityIndicator } from 'react-native';
import Video, { OnProgressData, OnLoadData, VideoRef, OnVideoErrorData, SelectedTrackType } from 'react-native-video';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import PlayIcon from '../../../../assets/icons/play.svg';
import { useActiveVideoStore, saveVideoPosition, getVideoPosition, clearVideoPosition } from '../../store/useActiveVideoStore';
import { BrightnessOverlay } from './BrightnessOverlay';
import { RefreshCcw, AlertCircle, Pause, Repeat1 } from 'lucide-react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { getBufferConfig } from '../../../core/utils/bufferConfig';
import { VideoSeekBar } from './VideoSeekBar';
import { useSharedValue, SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoCacheService } from '../../../data/services/VideoCacheService';
import { Image } from 'expo-image';
import { PerformanceLogger } from '../../../core/services/PerformanceLogger';
import { CarouselLayer } from './CarouselLayer';
import { SupabaseVideoDataSource } from '../../../data/datasources/SupabaseVideoDataSource';
import { useAuthStore } from '../../store/useAuthStore';

const videoDataSource = new SupabaseVideoDataSource();

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
    isCleanScreen?: boolean;
    onVideoEnd?: () => void;
    onProgressUpdate?: (progress: number, duration: number) => void;
    onSeekReady?: (seekFn: (time: number) => void) => void;
    isScrolling?: SharedValue<boolean>;
    onResizeModeChange?: (mode: 'contain' | 'cover') => void; // NEW: Notify parent of resize mode
    onRemoveVideo?: () => void; // NEW: Callback to remove video on critical error
    tapIndicator?: 'play' | 'pause' | null;
}

const MAX_LOOPS = 2;
const MAX_RETRIES = 3;

export const VideoLayer = memo(function VideoLayer({
    video,
    isActive,
    isMuted,
    isCleanScreen = false,
    onVideoEnd,
    onProgressUpdate,
    onSeekReady,
    isScrolling,
    onResizeModeChange, // NEW
    onRemoveVideo, // NEW
    tapIndicator,
}: VideoLayerProps) {
    const isAppActive = useActiveVideoStore((state) => state.isAppActive);
    const isScreenFocused = useActiveVideoStore((state) => state.isScreenFocused);
    const isSeeking = useActiveVideoStore((state) => state.isSeeking);
    const isPausedGlobal = useActiveVideoStore((state) => state.isPaused);
    const setPaused = useActiveVideoStore((state) => state.setPaused);
    const playbackRate = useActiveVideoStore((state) => state.playbackRate);
    const viewingMode = useActiveVideoStore((state) => state.viewingMode);
    const maxLoops = viewingMode === 'off' ? MAX_LOOPS : 1;

    // Debug state changes only when there's an issue (removed constant spam)

    const { type: networkType } = useNetInfo();
    const defaultBufferConfig = getBufferConfig(networkType);

    const [isFinished, setIsFinished] = useState(false);
    const [duration, setDuration] = useState(0);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [key, setKey] = useState(0); // For forcing re-render implementation

    const shouldPlay = isActive && isAppActive && isScreenFocused && !isSeeking && !isPausedGlobal && !isFinished && !hasError;

    // Debug: Log when shouldPlay changes
    useEffect(() => {
        if (isActive) {
            console.log(`[VideoTransition] 🎮 shouldPlay=${shouldPlay} for ${video.id} at ${Date.now()}`);
        }
    }, [shouldPlay, isActive, video.id]);

    const rateLabel =
        isActive && playbackRate > 1
            ? (Number.isInteger(playbackRate) ? `${playbackRate}x` : `${playbackRate.toFixed(1)}x`)
            : null;

    // 🔥 CRITICAL: Calculate resizeMode UPFRONT using pre-stored dimensions
    // This prevents re-render during video load which causes 2-3 second delay!
    const [resizeMode, setResizeMode] = useState<'cover' | 'contain' | 'stretch'>(() => {
        if (video.width && video.height) {
            const aspectRatio = video.width / video.height;
            // Vertical videos (aspectRatio < 0.8) = cover, Landscape/Square = contain
            return aspectRatio < 0.8 ? 'cover' : 'contain';
        }
        return 'cover'; // Default for unknown dimensions
    });

    // Poster State (Manual Overlay)
    const [showPoster, setShowPoster] = useState(true);
    // Removed isReadyForDisplay - causes 1.4s delay on scroll because paused videos don't trigger onReadyForDisplay

    // Cache-First Strategy: Don't set source until we check cache
    const [videoSource, setVideoSource] = useState<any>(null);
    const [isSourceReady, setIsSourceReady] = useState(false);

    // Optimize buffer based on source type (TikTok-style aggressive buffering)
    const isLocal = videoSource?.uri?.startsWith('file://');
    const isHLS = typeof video.videoUrl === 'string' && video.videoUrl.endsWith('.m3u8');

    const bufferConfig = isLocal
        ? {
            // 🔥 AGGRESSIVE: Cached files - start playing ASAP
            minBufferMs: 250,
            maxBufferMs: 1500,
            bufferForPlaybackMs: 50,  // TikTok-style: minimal buffer before play
            bufferForPlaybackAfterRebufferMs: 100
        }
        : isHLS
            ? {
                // HLS: larger buffer for segment streaming
                minBufferMs: 2000,
                maxBufferMs: 10000,
                bufferForPlaybackMs: 500,
                bufferForPlaybackAfterRebufferMs: 1000
            }
            : defaultBufferConfig;

    // Local SharedValues for SeekBar
    const currentTimeSV = useSharedValue(0);
    const durationSV = useSharedValue(0);

    const videoRef = useRef<VideoRef>(null);
    const loopCount = useRef(0);
    const memoryCachedRef = useRef(false); // Track if loaded from memory cache
    const hasInitialSeekPerformed = useRef(false); // Prevent seek loop

    // Cache-First Strategy: Check cache BEFORE setting source
    // Always init source for mounted videos (FlashList handles recycling correctly with proper keys)
    useEffect(() => {
        let isCancelled = false;
        const startTime = Date.now(); // ⏱️ TIMING START

        const initVideoSource = async () => {
            if (typeof video.videoUrl !== 'string') {
                setVideoSource(video.videoUrl);
                setIsSourceReady(true);
                return;
            }

            console.log(`[VideoTransition] 🔍 Source init START for ${video.id} at ${Date.now()}`);

            // STEP 1: Memory cache (synchronous, instant)
            const memoryCached = VideoCacheService.getMemoryCachedPath(video.videoUrl);

            if (memoryCached && !isCancelled) {
                const isHLS = video.videoUrl.endsWith('.m3u8');
                console.log(`[VideoTransition] 🚀 Memory cache HIT: ${video.id} in ${Date.now() - startTime}ms`);
                memoryCachedRef.current = !isHLS;
                setVideoSource({ uri: memoryCached });
                setIsSourceReady(true);
                return;
            }

            // STEP 2: Disk cache (async, fast)
            const diskCached = await VideoCacheService.getCachedVideoPath(video.videoUrl);
            const checkTime = Date.now() - startTime;

            if (diskCached && !isCancelled) {
                console.log(`[VideoTransition] ⚡ Disk cache HIT: ${video.id} in ${checkTime}ms`);
                memoryCachedRef.current = false;
                setVideoSource({ uri: diskCached });
                setIsSourceReady(true);
                return;
            }

            // STEP 3: Network fallback (slow)
            if (!isCancelled) {
                console.log(`[VideoTransition] 🌐 Network MISS: ${video.id} in ${Date.now() - startTime}ms`);
                memoryCachedRef.current = false;
                setVideoSource({ uri: video.videoUrl });
                setIsSourceReady(true);
            }
        };

        // Reset states
        setIsSourceReady(false);
        setShowPoster(true);
        memoryCachedRef.current = false;
        hasInitialSeekPerformed.current = false;

        // Initialize source with cache-first strategy
        initVideoSource();

        return () => { isCancelled = true; };
    }, [video.id]); // Reinit when video changes (FlashList cell recycling)


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

    // 🔥 ALWAYS start from beginning when becoming active
    useEffect(() => {
        if (isActive) {
            console.log(`[VideoTransition] ⏱️ Video ${video.id} became ACTIVE at ${Date.now()}`);
            videoRef.current?.seek(0);
            currentTimeSV.value = 0;
            setIsFinished(false);

            // Record view
            const userId = useAuthStore.getState().user?.id;
            if (userId && video.id) {
                videoDataSource.recordVideoView(video.id, userId).catch(err => {
                    console.error('[VideoLayer] recordVideoView error:', err);
                });
            }
        }
    }, [isActive, video.id]);

    // Unlock orientation when component unmounts
    useEffect(() => {
        return () => {
            if (ScreenOrientation) {
                ScreenOrientation.unlockAsync?.().catch((e: any) => {
                    // This error "The current activity is no longer available" is common during unmount
                    // and can be safely ignored as we're cleaning up anyway.
                    console.log('[VideoLayer] Orientation unlock skipped:', e.message);
                });
            }
        };
    }, []);

    // 🎬 POSITION MEMORY: REMOVED - Videos always start from beginning
    // User requested: Video should restart when returning, not resume from saved position

    // Track if user toggled pause (for replay detection)
    const wasPausedBefore = useRef(isPausedGlobal);

    // Handle Manual Replay (only when user TAPS to unpause a finished video)
    useEffect(() => {
        // Detect if isPausedGlobal changed from true to false (user tapped)
        const userToggledToUnpause = wasPausedBefore.current === true && isPausedGlobal === false;
        wasPausedBefore.current = isPausedGlobal;

        // Only restart if: user tapped to unpause + video was finished + video is active
        if (userToggledToUnpause && isFinished && isActive) {
            // Silently restart
            setIsFinished(false);
            loopCount.current = 0;
            clearVideoPosition(video.id);
            videoRef.current?.seek(0);
        }
    }, [isPausedGlobal, isFinished, isActive, video.id]);

    // shouldPlay logic moved to top of component to include isScreenFocused
    // const shouldPlay = isActive && isAppActive && !isSeeking && !isPausedGlobal && !isFinished && !hasError;

    const handleLoad = useCallback((data: OnLoadData) => {
        console.log(`[VideoTransition] 📦 onLoad triggered for ${video.id} at ${Date.now()}`);

        setDuration(data.duration);
        durationSV.value = data.duration;
        setHasError(false);

        // 🔥 FIX: Hide poster immediately for cached videos (they load fast)
        // For network videos, wait for onReadyForDisplay to avoid flickering
        const source = videoSource?.uri?.startsWith('file://')
            ? 'disk-cache'
            : isHLS ? 'network' : memoryCachedRef.current ? 'memory-cache' : 'network';

        if (source === 'disk-cache' || source === 'memory-cache') {
            console.log(`[VideoTransition] 🖼️ Poster HIDDEN (cached) for ${video.id} at ${Date.now()}`);
            setShowPoster(false);
        }

        PerformanceLogger.endTransition(video.id, source);

        // Note: resizeMode is pre-calculated from video.width/height in useState
        // onResizeModeChange is called if parent needs to know
        if (data.naturalSize) {
            const aspectRatio = data.naturalSize.width / data.naturalSize.height;
            onResizeModeChange?.(aspectRatio < 0.8 ? 'cover' : 'contain');
        }
    }, [onResizeModeChange, video.id, videoSource, isHLS]);

    const handleVideoError = useCallback(async (error: OnVideoErrorData) => {
        console.error(`[VideoLayer] Error playing video ${video.id}:`, error);

        // Auto-Remove Logic: If 404 or max retries
        // Note: react-native-video error structure varies. Check payload.
        // If it's a 404 or access denied, no point retrying.
        // For now, let's rely on MAX_RETRIES + 1 or specific error codes if available.

        if (retryCount >= MAX_RETRIES) {
            console.log(`[VideoLayer] Max retries (${MAX_RETRIES}) reached for ${video.id}. Removing from feed.`);
            onRemoveVideo?.();
            return;
        }

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

        // Auto-retry via handleRetry (which user usually presses, but we can also auto-trigger if needed,
        // but let's stick to manual retry for UI feedback, UNLESS it's a critical 'Not Found' error)
    }, [video.id, video.videoUrl, videoSource, retryCount, onRemoveVideo]);

    const handleRetry = useCallback(() => {
        setRetryCount(prev => prev + 1);
        setHasError(false);
        setKey(prev => prev + 1); // Force re-mount of video component
    }, []);

    const handleProgress = useCallback((data: OnProgressData) => {
        onProgressUpdate?.(data.currentTime, duration);
        currentTimeSV.value = data.currentTime;
        // Update durationSV only once when duration is available (avoid reading .value)
        if (duration > 0) {
            durationSV.value = duration;
        }
    }, [duration, onProgressUpdate]);

    const handleEnd = useCallback(() => {
        loopCount.current += 1;
        console.log(`[Loop] 🔄 Video ${video.id} ended, loop ${loopCount.current}/${MAX_LOOPS}`);

        if (loopCount.current >= maxLoops) {
            console.log(`[Loop] ✅ Max loops reached, showing replay icon`);
            setIsFinished(true);
            clearVideoPosition(video.id); // Clear position on finish
            onVideoEnd?.();
        } else {
            console.log(`[Loop] ⏪ Looping video from start`);
            videoRef.current?.seek(0);
        }
    }, [onVideoEnd, video.id]);

    const seekTo = useCallback((time: number) => {
        videoRef.current?.seek(time);
        if (isFinished) {
            setIsFinished(false);
            setPaused(false);
        }
    }, [isFinished, setPaused]);

    // Provide seek function to parent when active (NO auto-reset - position memory handles it)
    useEffect(() => {
        if (isActive && !hasError) {
            onSeekReady?.(seekTo);
        }
    }, [isActive, seekTo, onSeekReady, hasError]);

    // Icons
    const showTapIndicator = isActive && !!tapIndicator && !hasError;
    const showReplayIcon = isFinished && isActive && !hasError && !showTapIndicator;
    const showUiOverlays = !isCleanScreen;

    return (
        <View style={styles.container}>
            {/* Carousel Content */}
            {video.postType === 'carousel' && video.mediaUrls ? (
                <CarouselLayer
                    mediaUrls={video.mediaUrls}
                    isActive={isActive && isAppActive && isScreenFocused && !isPausedGlobal}
                    isMuted={isMuted}
                />
            ) : (
                /* Only render Video component when source is ready */
                isSourceReady && videoSource && (
                    <Video
                        key={`${video.id}-${key}`}
                        ref={videoRef}
                        source={videoSource}
                        style={[styles.video, { backgroundColor: '#000' }]} // Black bg to prevent white flash
                        resizeMode={resizeMode}
                        repeat={false}
                        controls={false}
                        paused={!shouldPlay}
                        muted={isMuted}
                        selectedAudioTrack={isMuted ? { type: SelectedTrackType.DISABLED } : undefined}
                        rate={playbackRate}
                        bufferConfig={bufferConfig}
                        onLoad={handleLoad}
                        onReadyForDisplay={() => {
                            // 🔥 CRITICAL: Hide poster when first frame is ready
                            console.log(`[VideoTransition] 🎬 onReadyForDisplay for ${video.id} at ${Date.now()}`);
                            setShowPoster(false);
                        }}
                        onError={handleVideoError}
                        onProgress={handleProgress}
                        onEnd={handleEnd}
                        playInBackground={false}
                        playWhenInactive={false}
                        ignoreSilentSwitch="ignore"
                        mixWithOthers={isMuted ? "mix" : undefined}
                        disableFocus={isMuted}
                        progressUpdateInterval={33}
                        automaticallyWaitsToMinimizeStalling={true}
                        preventsDisplaySleepDuringVideoPlayback={true}
                    />
                )
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

            {rateLabel && (
                <View style={styles.rateBadge} pointerEvents="none">
                    <Text style={styles.rateText}>{rateLabel}</Text>
                </View>
            )}

            {showUiOverlays && (
                <LinearGradient
                    colors={['rgba(0,0,0,0.15)', 'transparent', 'transparent', 'rgba(0,0,0,0.5)']}
                    locations={[0, 0.2, 0.6, 1]}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                />
            )}

            {/* Tap Play/Pause Icon Overlay */}
            {showUiOverlays && showTapIndicator && (
                <View style={styles.touchArea} pointerEvents="none">
                    <View style={styles.iconContainer}>
                        <View style={styles.iconBackground}>
                            {tapIndicator === 'pause' ? (
                                <Pause size={44} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
                            ) : (
                                <PlayIcon width={44} height={44} color="#FFFFFF" style={{ marginLeft: 5 }} />
                            )}
                        </View>
                    </View>
                </View>
            )}

            {/* Replay Icon Overlay */}
            {showUiOverlays && showReplayIcon && (
                <View style={styles.touchArea} pointerEvents="none">
                    <View style={styles.iconContainer}>
                        <View style={styles.iconBackground}>
                            <Repeat1 size={44} color="#FFFFFF" strokeWidth={1.2} />
                        </View>
                    </View>
                </View>
            )}

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


            {/* Per-Video Seekbar (Only for standard videos) */}
            {showUiOverlays && video.postType !== 'carousel' && (
                <VideoSeekBar
                    currentTime={currentTimeSV}
                    duration={durationSV}
                    isScrolling={isScrolling}
                    onSeek={seekTo}
                    isActive={isActive}
                    spriteUrl={video.spriteUrl}
                />
            )}
        </View>
    );
}, (prev, next) => {
    // Return TRUE to SKIP re-render (props haven't changed)
    // Return FALSE to re-render (props changed)
    return (
        prev.video.id === next.video.id &&
        prev.isActive === next.isActive &&
        prev.isMuted === next.isMuted &&
        prev.isCleanScreen === next.isCleanScreen &&
        prev.tapIndicator === next.tapIndicator
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        paddingTop: 0,
        paddingBottom: 25,
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
        width: 80,
        height: 80,
        borderRadius: 40,
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
    rateBadge: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -24 }, { translateY: -16 }],
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 12,
    },
    rateText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '600',
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
