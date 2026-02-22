import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Video from 'react-native-video';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_ASPECT_RATIO_DEFAULT = 16 / 9;

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
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * PREVIEW_ASPECT_RATIO_DEFAULT,
        backgroundColor: '#000000',
    },
});
