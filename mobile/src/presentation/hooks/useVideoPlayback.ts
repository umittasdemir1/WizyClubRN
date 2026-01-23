import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import type { OnLoadData, OnProgressData, OnVideoErrorData, VideoRef } from 'react-native-video';
import { Video as VideoEntity } from '../../domain/entities/Video';
import { useActiveVideoStore, clearVideoPosition } from '../store/useActiveVideoStore';
import { SupabaseVideoDataSource } from '../../data/datasources/SupabaseVideoDataSource';
import { useAuthStore } from '../store/useAuthStore';
import { PerformanceLogger } from '../../core/services/PerformanceLogger';
import { VideoCacheService } from '../../data/services/VideoCacheService';

const videoDataSource = new SupabaseVideoDataSource();

let ScreenOrientation: any = null;
try {
    ScreenOrientation = require('expo-screen-orientation');
} catch (e) {
    console.log('[useVideoPlayback] expo-screen-orientation not available (native build required)');
}

const MAX_LOOPS = 2;
const MAX_RETRIES = 3;

interface UseVideoPlaybackParams {
    video: VideoEntity;
    shouldLoad: boolean;
    isActive: boolean;
    videoSource: any;
    onVideoEnd?: () => void;
    onProgressUpdate?: (progress: number, duration: number) => void;
    onSeekReady?: (seekFn: (time: number) => void) => void;
    onRemoveVideo?: () => void;
    onResizeModeChange?: (mode: 'contain' | 'cover') => void;
    onCachedSourceLoaded?: () => void;
    onUseNetworkSource?: () => void;
}

interface UseVideoPlaybackResult {
    videoRef: RefObject<VideoRef | null>;
    playerKey: number;
    shouldPlay: boolean;
    rateLabel: string | null;
    hasError: boolean;
    isFinished: boolean;
    retryCount: number;
    playbackRate: number;
    currentTimeSV: ReturnType<typeof useSharedValue<number>>;
    durationSV: ReturnType<typeof useSharedValue<number>>;
    handleLoad: (data: OnLoadData) => void;
    handleProgress: (data: OnProgressData) => void;
    handleError: (error: OnVideoErrorData) => void;
    handleEnd: () => void;
    handleRetry: () => void;
    seekTo: (time: number) => void;
}

export function useVideoPlayback({
    video,
    shouldLoad,
    isActive,
    videoSource,
    onVideoEnd,
    onProgressUpdate,
    onSeekReady,
    onRemoveVideo,
    onResizeModeChange,
    onCachedSourceLoaded,
    onUseNetworkSource,
}: UseVideoPlaybackParams): UseVideoPlaybackResult {
    const isAppActive = useActiveVideoStore((state) => state.isAppActive);
    const isScreenFocused = useActiveVideoStore((state) => state.isScreenFocused);
    const isSeeking = useActiveVideoStore((state) => state.isSeeking);
    const isPausedGlobal = useActiveVideoStore((state) => state.isPaused);
    const setPaused = useActiveVideoStore((state) => state.setPaused);
    const playbackRate = useActiveVideoStore((state) => state.playbackRate);
    const viewingMode = useActiveVideoStore((state) => state.viewingMode);
    const maxLoops = viewingMode === 'off' ? MAX_LOOPS : 1;

    const [isFinished, setIsFinished] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [playerKey, setPlayerKey] = useState(0);
    const [duration, setDuration] = useState(0);

    const currentTimeSV = useSharedValue(0);
    const durationSV = useSharedValue(0);

    const videoRef = useRef<VideoRef>(null);
    const loopCount = useRef(0);
    const wasPausedBefore = useRef(isPausedGlobal);

    const shouldPlay = shouldLoad && isActive && isAppActive && isScreenFocused && !isSeeking && !isPausedGlobal && !isFinished && !hasError;

    const rateLabel = useMemo(() => {
        if (!isActive || playbackRate <= 1) return null;
        return Number.isInteger(playbackRate) ? `${playbackRate}x` : `${playbackRate.toFixed(1)}x`;
    }, [isActive, playbackRate]);

    useEffect(() => {
        if (!shouldLoad) return;
        setIsFinished(false);
        setHasError(false);
        setRetryCount(0);
        loopCount.current = 0;
        currentTimeSV.value = 0;
        durationSV.value = 0;
        videoRef.current?.seek(0);
    }, [video.id, shouldLoad]);

    useEffect(() => {
        if (!shouldLoad) return;
        if (isActive) {
            console.log(`[VideoTransition] ⏱️ Video ${video.id} became ACTIVE at ${Date.now()}`);
            videoRef.current?.seek(0);
            currentTimeSV.value = 0;
            setIsFinished(false);

            const userId = useAuthStore.getState().user?.id;
            if (userId && video.id) {
                videoDataSource.recordVideoView(video.id, userId).catch((err) => {
                    console.error('[VideoLayer] recordVideoView error:', err);
                });
            }
        }
    }, [isActive, video.id, shouldLoad]);

    useEffect(() => {
        if (!shouldLoad) return;
        const userToggledToUnpause = wasPausedBefore.current === true && isPausedGlobal === false;
        wasPausedBefore.current = isPausedGlobal;

        if (userToggledToUnpause && isFinished && isActive) {
            setIsFinished(false);
            loopCount.current = 0;
            clearVideoPosition(video.id);
            videoRef.current?.seek(0);
        }
    }, [isPausedGlobal, isFinished, isActive, video.id, shouldLoad]);

    // Cleanup on unmount - prevent memory leaks
    useEffect(() => {
        return () => {
            // Pause video to stop playback and release resources
            if (videoRef.current) {
                try {
                    videoRef.current.pause();
                    videoRef.current.seek(0);
                } catch (err) {
                    // Silently ignore cleanup errors
                }
            }

            // Reset shared values
            currentTimeSV.value = 0;
            durationSV.value = 0;

            // Unlock orientation if needed
            if (ScreenOrientation) {
                ScreenOrientation.unlockAsync?.().catch((err: any) => {
                    console.log('[useVideoPlayback] Orientation unlock skipped:', err.message);
                });
            }
        };
    }, []);

    const handleLoad = useCallback((data: OnLoadData) => {
        setDuration(data.duration);
        durationSV.value = data.duration;
        setHasError(false);

        if (videoSource?.uri?.startsWith('file://')) {
            onCachedSourceLoaded?.();
        }

        const sourceType = videoSource?.uri?.startsWith('file://') ? 'disk-cache' : 'network';
        PerformanceLogger.endTransition(video.id, sourceType);

        if (data.naturalSize) {
            const aspectRatio = data.naturalSize.width / data.naturalSize.height;
            onResizeModeChange?.(aspectRatio < 0.8 ? 'cover' : 'contain');
        }
    }, [durationSV, onCachedSourceLoaded, onResizeModeChange, video.id, videoSource]);

    const handleError = useCallback(async (error: OnVideoErrorData) => {
        console.error(`[VideoLayer] Error playing video ${video.id}:`, error);

        if (retryCount >= MAX_RETRIES) {
            console.log(`[VideoLayer] Max retries (${MAX_RETRIES}) reached for ${video.id}. Removing from feed.`);
            onRemoveVideo?.();
            return;
        }

        if (videoSource?.uri?.startsWith('file://')) {
            console.warn(`[VideoLayer] Cache file failed for ${video.id}. Deleting corrupt cache and falling back to Network.`);
            await VideoCacheService.deleteCachedVideo(video.videoUrl);
            onUseNetworkSource?.();
            setHasError(false);
            setPlayerKey((prev) => prev + 1);
            return;
        }

        console.error(`[VideoLayer] Faulty URL:`, video.videoUrl);
        console.error(`[VideoLayer] Current Source:`, videoSource);
        setHasError(true);
    }, [video.id, video.videoUrl, videoSource, retryCount, onRemoveVideo, onUseNetworkSource]);

    const handleRetry = useCallback(() => {
        setRetryCount((prev) => prev + 1);
        setHasError(false);
        setPlayerKey((prev) => prev + 1);
    }, []);

    const handleProgress = useCallback((data: OnProgressData) => {
        onProgressUpdate?.(data.currentTime, duration);
        currentTimeSV.value = data.currentTime;
        if (duration > 0) {
            durationSV.value = duration;
        }
    }, [duration, onProgressUpdate, currentTimeSV, durationSV]);

    const handleEnd = useCallback(() => {
        loopCount.current += 1;
        console.log(`[Loop] 🔄 Video ${video.id} ended, loop ${loopCount.current}/${MAX_LOOPS}`);

        if (loopCount.current >= maxLoops) {
            console.log(`[Loop] ✅ Max loops reached, showing replay icon`);
            setIsFinished(true);
            clearVideoPosition(video.id);
            onVideoEnd?.();
        } else {
            console.log(`[Loop] ⏪ Looping video from start`);
            videoRef.current?.seek(0);
        }
    }, [onVideoEnd, video.id, maxLoops]);

    const seekTo = useCallback((time: number) => {
        videoRef.current?.seek(time);
        if (isFinished) {
            setIsFinished(false);
            setPaused(false);
        }
    }, [isFinished, setPaused]);

    useEffect(() => {
        if (isActive && !hasError) {
            onSeekReady?.(seekTo);
        }
    }, [isActive, seekTo, onSeekReady, hasError]);

    return {
        videoRef,
        playerKey,
        shouldPlay,
        rateLabel,
        hasError,
        isFinished,
        retryCount,
        playbackRate,
        currentTimeSV,
        durationSV,
        handleLoad,
        handleProgress,
        handleError,
        handleEnd,
        handleRetry,
        seekTo,
    };
}
