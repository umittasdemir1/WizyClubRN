import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import type { OnLoadData, OnProgressData, OnVideoErrorData, VideoRef } from 'react-native-video';
import { Video as VideoEntity } from '../../domain/entities/Video';
import { useActiveVideoStore, clearVideoPosition } from '../store/useActiveVideoStore';
import { SupabaseVideoDataSource } from '../../data/datasources/SupabaseVideoDataSource';
import { useAuthStore } from '../store/useAuthStore';
import { PerformanceLogger } from '../../core/services/PerformanceLogger';
import { VideoCacheService } from '../../data/services/VideoCacheService';
import { LogCode, logVideo, logError, logSystem } from '@/core/services/Logger';

const videoDataSource = new SupabaseVideoDataSource();

let ScreenOrientation: any = null;
try {
    ScreenOrientation = require('expo-screen-orientation');
} catch (e) {
    logSystem(LogCode.WARNING_IGNORED, 'expo-screen-orientation not available (native build required)');
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
            logVideo(LogCode.VIDEO_PLAYBACK_START, 'Video became active', { videoId: video.id, timestamp: Date.now() });
            videoRef.current?.seek(0);
            currentTimeSV.value = 0;
            setIsFinished(false);

            const userId = useAuthStore.getState().user?.id;
            if (userId && video.id) {
                videoDataSource.recordVideoView(video.id, userId).catch((err) => {
                    logError(LogCode.ERROR_CAUGHT, 'Failed to record video view', err);
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
                    logSystem(LogCode.WARNING_IGNORED, 'Orientation unlock skipped', { error: err.message });
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
        logError(LogCode.VIDEO_PLAYBACK_ERROR, 'Error playing video', { videoId: video.id, error });

        if (retryCount >= MAX_RETRIES) {
            logVideo(LogCode.VIDEO_LOAD_ERROR, 'Max retries reached, removing from feed', { videoId: video.id, maxRetries: MAX_RETRIES });
            onRemoveVideo?.();
            return;
        }

        if (videoSource?.uri?.startsWith('file://')) {
            logError(LogCode.CACHE_ERROR, 'Cache file failed, falling back to network', { videoId: video.id });
            await VideoCacheService.deleteCachedVideo(video.videoUrl);
            onUseNetworkSource?.();
            setHasError(false);
            setPlayerKey((prev) => prev + 1);
            return;
        }

        logError(LogCode.VIDEO_LOAD_ERROR, 'Faulty video source', { videoUrl: video.videoUrl, source: videoSource });
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
        logVideo(LogCode.VIDEO_PLAYBACK_PAUSE, 'Video ended', { videoId: video.id, loop: loopCount.current, maxLoops: MAX_LOOPS });

        if (loopCount.current >= maxLoops) {
            logVideo(LogCode.VIDEO_PLAYBACK_PAUSE, 'Max loops reached, showing replay icon', { videoId: video.id });
            setIsFinished(true);
            clearVideoPosition(video.id);
            onVideoEnd?.();
        } else {
            logVideo(LogCode.VIDEO_PLAYBACK_START, 'Looping video from start', { videoId: video.id });
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
