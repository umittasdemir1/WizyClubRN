/**
 * VideoPlayerPool - TikTok-style Video Player Recycling
 * 
 * Instead of creating a new Video component for each item,
 * we maintain a pool of 3 players that get recycled as user scrolls.
 * 
 * Pool slots:
 * - current: The video currently playing
 * - next: Preloaded, ready for instant playback
 * - previous: Cached, ready if user scrolls back
 */

import React, { useRef, useState, useCallback, useEffect, memo, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Video, { VideoRef, OnLoadData, OnProgressData, OnVideoErrorData } from 'react-native-video';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import { VideoCacheService } from '../../../data/services/VideoCacheService';
import { Image } from 'expo-image';
import { getBufferConfig } from '../../../core/utils/bufferConfig';
import { useNetInfo } from '@react-native-community/netinfo';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface PlayerSlot {
    index: number;        // Video index in the feed
    videoId: string;      // Video ID
    source: string;       // Video URL or cached path
    position: number;     // Last playback position
    isLoaded: boolean;    // Whether video is ready to play
    resizeMode: 'cover' | 'contain';
}

interface VideoPlayerPoolProps {
    videos: VideoEntity[];
    activeIndex: number;
    isMuted: boolean;
    isPaused: boolean;
    onVideoLoaded: (index: number) => void;
    onVideoError: (index: number, error: any) => void;
    onProgress: (index: number, currentTime: number, duration: number) => void;
    onVideoEnd: (index: number) => void;
}

export const VideoPlayerPool = memo(function VideoPlayerPool({
    videos,
    activeIndex,
    isMuted,
    isPaused,
    onVideoLoaded,
    onVideoError,
    onProgress,
    onVideoEnd,
}: VideoPlayerPoolProps) {
    const netInfo = useNetInfo();
    const bufferConfig = getBufferConfig(netInfo.type);

    // 3 Player Refs
    const player1Ref = useRef<VideoRef>(null);
    const player2Ref = useRef<VideoRef>(null);
    const player3Ref = useRef<VideoRef>(null);

    // Player slots state
    const [slots, setSlots] = useState<PlayerSlot[]>([
        { index: 0, videoId: '', source: '', position: 0, isLoaded: false, resizeMode: 'cover' },
        { index: 1, videoId: '', source: '', position: 0, isLoaded: false, resizeMode: 'cover' },
        { index: -1, videoId: '', source: '', position: 0, isLoaded: false, resizeMode: 'cover' },
    ]);

    // Which slot is currently active (0, 1, or 2)
    const activeSlot = useRef(0);

    // Initialize/recycle players when activeIndex changes
    useEffect(() => {
        const recycleSlots = async () => {
            const newSlots: PlayerSlot[] = [...slots];

            // Calculate which videos should be in each slot
            const currentIdx = activeIndex;
            const nextIdx = Math.min(activeIndex + 1, videos.length - 1);
            const prevIdx = Math.max(activeIndex - 1, 0);

            // Get cached paths for each video
            const getSource = async (video: VideoEntity): Promise<string> => {
                if (typeof video.videoUrl !== 'string') return '';

                // Try memory cache first
                const memoryCached = VideoCacheService.getMemoryCachedPath(video.videoUrl);
                if (memoryCached) return memoryCached;

                // Try disk cache
                const diskCached = await VideoCacheService.getCachedVideoPath(video.videoUrl);
                if (diskCached) return diskCached;

                // Fallback to network
                return video.videoUrl;
            };

            // Calculate resizeMode
            const getResizeMode = (video: VideoEntity): 'cover' | 'contain' => {
                if (video.width && video.height) {
                    return (video.width / video.height) < 0.8 ? 'cover' : 'contain';
                }
                return 'cover';
            };

            // Update slots for current, next, previous
            if (videos[currentIdx]) {
                const source = await getSource(videos[currentIdx]);
                newSlots[0] = {
                    index: currentIdx,
                    videoId: videos[currentIdx].id,
                    source,
                    position: 0,
                    isLoaded: newSlots[0].videoId === videos[currentIdx].id, // Keep loaded state if same video
                    resizeMode: getResizeMode(videos[currentIdx]),
                };
            }

            if (videos[nextIdx] && nextIdx !== currentIdx) {
                const source = await getSource(videos[nextIdx]);
                newSlots[1] = {
                    index: nextIdx,
                    videoId: videos[nextIdx].id,
                    source,
                    position: 0,
                    isLoaded: newSlots[1].videoId === videos[nextIdx].id,
                    resizeMode: getResizeMode(videos[nextIdx]),
                };
            }

            if (videos[prevIdx] && prevIdx !== currentIdx) {
                const source = await getSource(videos[prevIdx]);
                newSlots[2] = {
                    index: prevIdx,
                    videoId: videos[prevIdx].id,
                    source,
                    position: 0,
                    isLoaded: newSlots[2].videoId === videos[prevIdx].id,
                    resizeMode: getResizeMode(videos[prevIdx]),
                };
            }

            setSlots(newSlots);
            console.log(`[PlayerPool] Recycled slots: current=${currentIdx}, next=${nextIdx}, prev=${prevIdx}`);
        };

        if (videos.length > 0) {
            recycleSlots();
        }
    }, [activeIndex, videos.length]);

    // Handle video loaded
    const handleLoad = useCallback((slotIndex: number, data: OnLoadData) => {
        setSlots(prev => {
            const newSlots = [...prev];
            newSlots[slotIndex].isLoaded = true;
            return newSlots;
        });
        onVideoLoaded(slots[slotIndex].index);
        console.log(`[PlayerPool] Slot ${slotIndex} loaded (video index: ${slots[slotIndex].index})`);
    }, [slots, onVideoLoaded]);

    // Handle video error
    const handleError = useCallback((slotIndex: number, error: OnVideoErrorData) => {
        console.error(`[PlayerPool] Slot ${slotIndex} error:`, error);
        onVideoError(slots[slotIndex].index, error);
    }, [slots, onVideoError]);

    const handleProgress = useCallback((slotIndex: number, data: OnProgressData) => {
        if (slotIndex === 0) { // Only track progress for active slot
            onProgress(slots[slotIndex].index, data.currentTime, data.seekableDuration);
        }
    }, [slots, onProgress]);

    // Handle video end
    const handleEnd = useCallback((slotIndex: number) => {
        console.log(`[PlayerPool] Slot ${slotIndex} ended`);
        onVideoEnd(slots[slotIndex].index);
    }, [slots, onVideoEnd]);

    // Render a single player
    const renderPlayer = (slotIndex: number, ref: React.RefObject<VideoRef | null>) => {
        const slot = slots[slotIndex];
        if (!slot.source) return null;

        const isActiveSlot = slotIndex === 0;
        const shouldPlay = isActiveSlot && !isPaused;

        return (
            <View
                key={`player-${slotIndex}`}
                style={[
                    styles.playerContainer,
                    {
                        opacity: isActiveSlot ? 1 : 0,
                        zIndex: isActiveSlot ? 10 : 1,
                        top: slot.index * SCREEN_HEIGHT - activeIndex * SCREEN_HEIGHT,
                    }
                ]}
                pointerEvents={isActiveSlot ? 'auto' : 'none'}
            >
                {/* Poster/Thumbnail */}
                {!slot.isLoaded && (
                    <Image
                        source={{ uri: videos[slot.index]?.thumbnailUrl }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                    />
                )}

                {/* Video Player */}
                <Video
                    ref={ref}
                    source={{ uri: slot.source }}
                    style={styles.video}
                    resizeMode={slot.resizeMode}
                    paused={!shouldPlay}
                    muted={isMuted}
                    repeat={false}
                    bufferConfig={bufferConfig}
                    onLoad={(data) => handleLoad(slotIndex, data)}
                    onError={(error) => handleError(slotIndex, error)}
                    onProgress={(data) => handleProgress(slotIndex, data)}
                    onEnd={() => handleEnd(slotIndex)}
                    playInBackground={false}
                    playWhenInactive={false}
                    ignoreSilentSwitch="ignore"
                    progressUpdateInterval={100}
                />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {renderPlayer(0, player1Ref)}
            {renderPlayer(1, player2Ref)}
            {renderPlayer(2, player3Ref)}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
    },
    playerContainer: {
        position: 'absolute',
        width: '100%',
        height: SCREEN_HEIGHT,
    },
    video: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
    },
});
