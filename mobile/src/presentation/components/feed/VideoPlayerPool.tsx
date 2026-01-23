/**
 * VideoPlayerPool - TikTok-style Video Player Recycling
 *
 * Instead of creating a new Video component for each item,
 * we maintain a pool of 3 players that get recycled as user scrolls.
 *
 * Pool slots:
 * - current (slot 0): The video currently playing
 * - next (slot 1): Preloaded, ready for instant playback
 * - previous (slot 2): Cached, ready if user scrolls back
 */

import React, { useRef, useState, useCallback, useEffect, memo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Video, { VideoRef, OnLoadData, OnProgressData, OnVideoErrorData, SelectedTrackType } from 'react-native-video';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import { VideoCacheService } from '../../../data/services/VideoCacheService';
import { Image } from 'expo-image';
import { getBufferConfig } from '../../../core/utils/bufferConfig';
import { useNetInfo } from '@react-native-community/netinfo';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_RETRIES = 3;

interface PlayerSlot {
    index: number;        // Video index in the feed
    videoId: string;      // Video ID
    source: string;       // Video URL or cached path
    position: number;     // Last playback position
    isLoaded: boolean;    // Whether video is ready to play
    resizeMode: 'cover' | 'contain';
    retryCount: number;   // Error retry count
    hasError: boolean;    // Whether slot has error
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
    onRemoveVideo?: (index: number) => void;
}

const createEmptySlot = (index: number = -1): PlayerSlot => ({
    index,
    videoId: '',
    source: '',
    position: 0,
    isLoaded: false,
    resizeMode: 'cover',
    retryCount: 0,
    hasError: false,
});

export const VideoPlayerPool = memo(function VideoPlayerPool({
    videos,
    activeIndex,
    isMuted,
    isPaused,
    onVideoLoaded,
    onVideoError,
    onProgress,
    onVideoEnd,
    onRemoveVideo,
}: VideoPlayerPoolProps) {
    const netInfo = useNetInfo();

    // 3 Player Refs
    const player1Ref = useRef<VideoRef>(null);
    const player2Ref = useRef<VideoRef>(null);
    const player3Ref = useRef<VideoRef>(null);
    const playerRefs = [player1Ref, player2Ref, player3Ref];

    // Player slots state
    const [slots, setSlots] = useState<PlayerSlot[]>([
        createEmptySlot(0),
        createEmptySlot(1),
        createEmptySlot(-1),
    ]);

    // Track if component is mounted
    const isMountedRef = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            // Pause all players on unmount
            playerRefs.forEach(ref => {
                try {
                    ref.current?.pause();
                } catch (e) {
                    // Silently ignore cleanup errors
                }
            });
        };
    }, []);

    // Initialize/recycle players when activeIndex changes
    useEffect(() => {
        if (!isMountedRef.current) return;

        const recycleSlots = async () => {
            const newSlots: PlayerSlot[] = [...slots];

            // Calculate which videos should be in each slot
            const currentIdx = activeIndex;
            const nextIdx = Math.min(activeIndex + 1, videos.length - 1);
            const prevIdx = Math.max(activeIndex - 1, 0);

            // Get cached paths for each video
            const getSource = async (video: VideoEntity): Promise<string> => {
                if (typeof video.videoUrl !== 'string') return '';

                // Try memory cache first (synchronous)
                const memoryCached = VideoCacheService.getMemoryCachedPath(video.videoUrl);
                if (memoryCached) return memoryCached;

                // Try disk cache (async)
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

            // Update slot 0 (current)
            if (videos[currentIdx]) {
                const source = await getSource(videos[currentIdx]);
                const isSameVideo = newSlots[0].videoId === videos[currentIdx].id;
                newSlots[0] = {
                    index: currentIdx,
                    videoId: videos[currentIdx].id,
                    source,
                    position: isSameVideo ? newSlots[0].position : 0,
                    isLoaded: isSameVideo ? newSlots[0].isLoaded : false,
                    resizeMode: getResizeMode(videos[currentIdx]),
                    retryCount: isSameVideo ? newSlots[0].retryCount : 0,
                    hasError: isSameVideo ? newSlots[0].hasError : false,
                };
            }

            // Update slot 1 (next)
            if (videos[nextIdx] && nextIdx !== currentIdx) {
                const source = await getSource(videos[nextIdx]);
                const isSameVideo = newSlots[1].videoId === videos[nextIdx].id;
                newSlots[1] = {
                    index: nextIdx,
                    videoId: videos[nextIdx].id,
                    source,
                    position: 0,
                    isLoaded: isSameVideo ? newSlots[1].isLoaded : false,
                    resizeMode: getResizeMode(videos[nextIdx]),
                    retryCount: isSameVideo ? newSlots[1].retryCount : 0,
                    hasError: isSameVideo ? newSlots[1].hasError : false,
                };
            }

            // Update slot 2 (previous)
            if (videos[prevIdx] && prevIdx !== currentIdx) {
                const source = await getSource(videos[prevIdx]);
                const isSameVideo = newSlots[2].videoId === videos[prevIdx].id;
                newSlots[2] = {
                    index: prevIdx,
                    videoId: videos[prevIdx].id,
                    source,
                    position: 0,
                    isLoaded: isSameVideo ? newSlots[2].isLoaded : false,
                    resizeMode: getResizeMode(videos[prevIdx]),
                    retryCount: isSameVideo ? newSlots[2].retryCount : 0,
                    hasError: isSameVideo ? newSlots[2].hasError : false,
                };
            }

            if (isMountedRef.current) {
                setSlots(newSlots);
                console.log(`[PlayerPool] Recycled slots: current=${currentIdx}, next=${nextIdx}, prev=${prevIdx}`);
            }
        };

        if (videos.length > 0) {
            recycleSlots();
        }
    }, [activeIndex, videos.length]);

    // Handle video loaded
    const handleLoad = useCallback((slotIndex: number, _data: OnLoadData) => {
        if (!isMountedRef.current) return;

        setSlots(prev => {
            const newSlots = [...prev];
            newSlots[slotIndex] = {
                ...newSlots[slotIndex],
                isLoaded: true,
                hasError: false,
            };
            return newSlots;
        });
        onVideoLoaded(slots[slotIndex].index);
        console.log(`[PlayerPool] Slot ${slotIndex} loaded (video index: ${slots[slotIndex].index})`);
    }, [slots, onVideoLoaded]);

    // Handle video error with retry logic
    const handleError = useCallback(async (slotIndex: number, error: OnVideoErrorData) => {
        if (!isMountedRef.current) return;

        const slot = slots[slotIndex];
        console.error(`[PlayerPool] Slot ${slotIndex} error (retry ${slot.retryCount}/${MAX_RETRIES}):`, error);

        // If max retries reached, mark as failed
        if (slot.retryCount >= MAX_RETRIES) {
            console.log(`[PlayerPool] Max retries reached for slot ${slotIndex}, removing video`);
            onRemoveVideo?.(slot.index);
            return;
        }

        // If cache file failed, try network fallback
        if (slot.source.startsWith('file://')) {
            const video = videos[slot.index];
            if (video) {
                console.warn(`[PlayerPool] Cache failed for slot ${slotIndex}, falling back to network`);
                await VideoCacheService.deleteCachedVideo(video.videoUrl);

                setSlots(prev => {
                    const newSlots = [...prev];
                    newSlots[slotIndex] = {
                        ...newSlots[slotIndex],
                        source: typeof video.videoUrl === 'string' ? video.videoUrl : '',
                        retryCount: newSlots[slotIndex].retryCount + 1,
                        hasError: false,
                    };
                    return newSlots;
                });
                return;
            }
        }

        // Mark as error and increment retry
        setSlots(prev => {
            const newSlots = [...prev];
            newSlots[slotIndex] = {
                ...newSlots[slotIndex],
                hasError: true,
                retryCount: newSlots[slotIndex].retryCount + 1,
            };
            return newSlots;
        });

        onVideoError(slot.index, error);
    }, [slots, videos, onVideoError, onRemoveVideo]);

    // Handle progress
    const handleProgress = useCallback((slotIndex: number, data: OnProgressData) => {
        if (!isMountedRef.current) return;
        if (slotIndex === 0) { // Only track progress for active slot
            onProgress(slots[slotIndex].index, data.currentTime, data.seekableDuration);
        }
    }, [slots, onProgress]);

    // Handle video end
    const handleEnd = useCallback((slotIndex: number) => {
        if (!isMountedRef.current) return;
        console.log(`[PlayerPool] Slot ${slotIndex} ended`);
        onVideoEnd(slots[slotIndex].index);
    }, [slots, onVideoEnd]);

    // Render a single player
    const renderPlayer = (slotIndex: number, ref: React.RefObject<VideoRef | null>) => {
        const slot = slots[slotIndex];
        if (!slot.source || slot.hasError) return null;

        const isActiveSlot = slotIndex === 0;
        const shouldPlay = isActiveSlot && !isPaused;
        const isLocal = slot.source.startsWith('file://');
        const bufferConfig = getBufferConfig(netInfo.type, isLocal);

        // Buffer config inside source object (new API)
        const sourceWithBuffer = {
            uri: slot.source,
            bufferConfig,
        };

        return (
            <View
                key={`player-${slotIndex}-${slot.videoId}`}
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
                {/* Poster/Thumbnail - shown until video is ready */}
                {!slot.isLoaded && videos[slot.index]?.thumbnailUrl && (
                    <Image
                        source={{ uri: videos[slot.index].thumbnailUrl }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        priority="high"
                    />
                )}

                {/* Video Player */}
                <Video
                    ref={ref}
                    source={sourceWithBuffer}
                    style={styles.video}
                    resizeMode={slot.resizeMode}
                    paused={!shouldPlay}
                    muted={isMuted}
                    selectedAudioTrack={isMuted ? { type: SelectedTrackType.DISABLED } : undefined}
                    repeat={false}
                    onLoad={(data) => handleLoad(slotIndex, data)}
                    onError={(error) => handleError(slotIndex, error)}
                    onProgress={(data) => handleProgress(slotIndex, data)}
                    onEnd={() => handleEnd(slotIndex)}
                    playInBackground={false}
                    playWhenInactive={false}
                    ignoreSilentSwitch="ignore"
                    mixWithOthers={isMuted ? "mix" : undefined}
                    disableFocus={isMuted}
                    progressUpdateInterval={33}
                    automaticallyWaitsToMinimizeStalling={true}
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
