import { useVideoPlayer, VideoView } from 'expo-video';
import { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Video } from '../../../domain/entities/Video';
import PlayIcon from '../../../../assets/icons/play.svg';
import ReplayIcon from '../../../../assets/icons/replay.svg';
import { VideoSeekBar } from './VideoSeekBar';

interface VideoLayerProps {
    video: Video;
    isActive: boolean;
    isMuted: boolean;
}

const MAX_LOOPS = 2;

export function VideoLayer({ video, isActive, isMuted }: VideoLayerProps) {
    const [isPlaying, setIsPlaying] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    const loopCount = useRef(0);

    // Initialize video player
    const player = useVideoPlayer(video.videoUrl, (player) => {
        player.loop = true;
        player.muted = isMuted;
    });

    // Reset state when video changes or becomes active again
    useEffect(() => {
        if (isActive) {
            setIsPlaying(true);
            setIsFinished(false);
            loopCount.current = 0;
            player.loop = true;
            player.play();
        } else {
            setIsPlaying(false);
            player.pause();
        }
    }, [isActive, player]);

    // Handle Play/Pause & Loop Logic
    useEffect(() => {
        const subscription = player.addListener('playToEnd', () => {
            loopCount.current += 1;
            if (loopCount.current >= MAX_LOOPS) {
                player.pause();
                setIsPlaying(false);
                setIsFinished(true);
                player.seekBy(-player.currentTime);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [player]);

    // Handle mute state changes
    useEffect(() => {
        player.muted = isMuted;
    }, [isMuted, player]);

    const handlePress = () => {
        if (isFinished) {
            // Replay logic
            setIsFinished(false);
            loopCount.current = 0;
            setIsPlaying(true);
            player.play();
        } else {
            // Toggle Play/Pause
            if (isPlaying) {
                player.pause();
            } else {
                player.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <View style={styles.container}>
            {/* Video - Full screen, no pointer blocking */}
            <VideoView
                player={player}
                style={styles.video}
                contentFit="cover"
                nativeControls={false}
            />

            {/* Play/Pause Pressable - Only for center tap, doesn't block scroll */}
            <Pressable
                style={styles.videoTouchArea}
                onPress={handlePress}
                pointerEvents="auto"
            >
                {/* Overlay Icons - Visual only, no touch */}
                {!isPlaying && !isFinished && (
                    <View style={styles.iconOverlay} pointerEvents="none">
                        <PlayIcon width={64} height={64} color="rgba(255,255,255,0.8)" />
                    </View>
                )}

                {isFinished && (
                    <View style={styles.iconOverlay} pointerEvents="none">
                        <ReplayIcon width={64} height={64} color="rgba(255,255,255,0.8)" />
                    </View>
                )}
            </Pressable>

            {/* Seek Bar - Highest z-index, captures its own touches */}
            <VideoSeekBar player={player} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    videoTouchArea: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    iconOverlay: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
