import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Video, { SelectedTrackType } from 'react-native-video';
import { useNetInfo } from '@react-native-community/netinfo';
import { SharedValue } from 'react-native-reanimated';
import { getBufferConfig } from '../../../core/utils/bufferConfig';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import { CarouselLayer } from './CarouselLayer';
import { VideoOverlays } from './VideoOverlays';
import { BrightnessOverlay } from './BrightnessOverlay';
import { useVideoSource } from '../../hooks/useVideoSource';
import { useVideoPlayback } from '../../hooks/useVideoPlayback';

interface VideoLayerProps {
    video: VideoEntity;
    shouldLoad?: boolean;
    isActive: boolean;
    isMuted: boolean;
    isCleanScreen?: boolean;
    tapIndicator?: 'play' | 'pause' | null;
    onVideoEnd?: () => void;
    onProgressUpdate?: (progress: number, duration: number) => void;
    onSeekReady?: (seekFn: (time: number) => void) => void;
    isScrolling?: SharedValue<boolean>;
    onResizeModeChange?: (mode: 'contain' | 'cover') => void;
    onRemoveVideo?: () => void;
    onDoubleTap?: () => void;
    onSingleTap?: () => void;
    onLongPress?: (event: any) => void;
    onPressOut?: () => void;
    onPressIn?: (event: any) => void;
    onCarouselTouchStart?: () => void;
    onCarouselTouchEnd?: () => void;
}

export const VideoLayer = memo(function VideoLayer({
    video,
    shouldLoad = true,
    isActive,
    isMuted,
    isCleanScreen = false,
    tapIndicator,
    onVideoEnd,
    onProgressUpdate,
    onSeekReady,
    isScrolling,
    onResizeModeChange,
    onRemoveVideo,
    onDoubleTap,
    onSingleTap,
    onLongPress,
    onPressOut,
    onPressIn,
    onCarouselTouchStart,
    onCarouselTouchEnd,
}: VideoLayerProps) {
    const isCarousel = video.postType === 'carousel' && (video.mediaUrls?.length ?? 0) > 0;

    const [resizeMode] = useState<'cover' | 'contain' | 'stretch'>(() => {
        if (video.width && video.height) {
            const aspectRatio = video.width / video.height;
            return aspectRatio < 0.8 ? 'cover' : 'contain';
        }
        return 'cover';
    });

    const [showPoster, setShowPoster] = useState(!isCarousel);

    useEffect(() => {
        setShowPoster(!isCarousel);
    }, [video.id, isCarousel, shouldLoad]);

    const { videoSource, isSourceReady, fallbackToNetwork } = useVideoSource(video, shouldLoad);

    const {
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
    } = useVideoPlayback({
        video,
        shouldLoad,
        isActive,
        videoSource,
        onVideoEnd,
        onProgressUpdate,
        onSeekReady,
        onRemoveVideo,
        onResizeModeChange,
        onCachedSourceLoaded: () => setShowPoster(false),
        onUseNetworkSource: fallbackToNetwork,
    });

    const { type: networkType } = useNetInfo();
    const isLocal = videoSource?.uri?.startsWith('file://');

    // Buffer config based on network type and cache status
    const bufferConfig = getBufferConfig(networkType, isLocal);

    // bufferConfig inside source object (new API)
    const sourceWithBuffer = videoSource ? {
        ...videoSource,
        bufferConfig,
    } : null;

    if (!shouldLoad) {
        return <View style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            {isCarousel ? (
                <CarouselLayer
                    mediaUrls={video.mediaUrls ?? []}
                    isActive={shouldPlay}
                    isMuted={isMuted}
                    isCleanScreen={isCleanScreen}
                    onDoubleTap={onDoubleTap}
                    onSingleTap={onSingleTap}
                    onLongPress={onLongPress}
                    onPressOut={onPressOut}
                    onPressIn={onPressIn}
                    onCarouselTouchStart={onCarouselTouchStart}
                    onCarouselTouchEnd={onCarouselTouchEnd}
                />
            ) : (
                isSourceReady && sourceWithBuffer && (
                    <Video
                        key={`${video.id}-${playerKey}`}
                        ref={videoRef}
                        source={sourceWithBuffer}
                        style={[styles.video, { backgroundColor: '#000' }]}
                        resizeMode={resizeMode}
                        repeat={false}
                        controls={false}
                        paused={!shouldPlay}
                        muted={isMuted}
                        selectedAudioTrack={isMuted ? { type: SelectedTrackType.DISABLED } : undefined}
                        rate={playbackRate}
                        onLoad={handleLoad}
                        onReadyForDisplay={() => setShowPoster(false)}
                        onError={handleError}
                        onProgress={handleProgress}
                        onEnd={handleEnd}
                        playInBackground={false}
                        playWhenInactive={false}
                        ignoreSilentSwitch="ignore"
                        mixWithOthers={isMuted ? 'mix' : undefined}
                        disableFocus={isMuted}
                        progressUpdateInterval={33}
                        automaticallyWaitsToMinimizeStalling={true}
                        preventsDisplaySleepDuringVideoPlayback={true}
                    />
                )
            )}

            <BrightnessOverlay />

            {video.postType !== 'carousel' && (
                <VideoOverlays
                    videoId={video.id}
                    isActive={isActive}
                    hasError={hasError}
                    isFinished={isFinished}
                    retryCount={retryCount}
                    isCleanScreen={isCleanScreen}
                    showPoster={showPoster}
                    tapIndicator={tapIndicator}
                    rateLabel={rateLabel}
                    currentTime={currentTimeSV}
                    duration={durationSV}
                    isScrolling={isScrolling}
                    spriteUrl={video.spriteUrl}
                    onRetry={handleRetry}
                    onSeek={seekTo}
                />
            )}
        </View>
    );
}, (prev, next) => {
    return (
        prev.video.id === next.video.id &&
        prev.shouldLoad === next.shouldLoad &&
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
        flex: 1,
    },
});
