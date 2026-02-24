import React from 'react';
import { StyleSheet } from 'react-native';
import Video from 'react-native-video';

interface VideoPlayerProps {
    uri: string;
    isActive: boolean;
    isMuted: boolean;
    isPaused?: boolean;
    onLoad?: (duration: number) => void;
    onProgress?: (currentTimeMs: number) => void;
}

export const VideoPlayerPreview = ({ uri, isActive, isMuted, isPaused = false, onLoad, onProgress }: VideoPlayerProps) => {
    return (
        <Video
            source={{ uri }}
            style={styles.previewMedia}
            resizeMode="cover"
            repeat={true}
            paused={!isActive || isPaused}
            muted={isMuted}
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
