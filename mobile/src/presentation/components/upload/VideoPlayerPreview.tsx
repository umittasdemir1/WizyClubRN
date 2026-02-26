import React from 'react';
import { StyleSheet } from 'react-native';
import Video from 'react-native-video';

interface VideoSeekRequest {
    positionMs: number;
    token: number;
}

interface VideoPlayerProps {
    uri: string;
    isActive: boolean;
    isMuted: boolean;
    isPaused?: boolean;
    seekRequest?: VideoSeekRequest | null;
    progressUpdateIntervalMs?: number;
    onLoad?: (duration: number) => void;
    onProgress?: (currentTimeMs: number) => void;
}

export const VideoPlayerPreview = ({
    uri,
    isActive,
    isMuted,
    isPaused = false,
    seekRequest,
    progressUpdateIntervalMs = 100,
    onLoad,
    onProgress,
}: VideoPlayerProps) => {
    const videoRef = React.useRef<any>(null);

    React.useEffect(() => {
        if (!isActive || !seekRequest) return;
        const nextSeconds = Math.max(0, seekRequest.positionMs / 1000);
        requestAnimationFrame(() => {
            try {
                videoRef.current?.seek(nextSeconds);
            } catch {
                // no-op
            }
        });
    }, [isActive, seekRequest]);

    return (
        <Video
            ref={videoRef}
            source={{ uri }}
            style={styles.previewMedia}
            resizeMode="cover"
            repeat={true}
            paused={!isActive || isPaused}
            muted={isMuted}
            progressUpdateInterval={progressUpdateIntervalMs}
            playInBackground={false}
            playWhenInactive={false}
            ignoreSilentSwitch="obey"
            onLoad={(data) => onLoad?.(data.duration)}
            onProgress={(data) => onProgress?.(data.currentTime * 1000)}
        />
    );
};

const styles = StyleSheet.create({
    previewMedia: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
    },
});
