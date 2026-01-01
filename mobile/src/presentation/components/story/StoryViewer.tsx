import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Pressable, ImageBackground } from 'react-native';
import { BlurView } from 'expo-blur';
import Video from 'react-native-video';
import { useSharedValue, withTiming, Easing, cancelAnimation, runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Story } from '../../../domain/entities/Story';
import { StoryHeader } from './StoryHeader';
import { StoryActions } from './StoryActions';
import { FlyingEmoji } from './FlyingEmoji';
import { useRouter } from 'expo-router';
import PagerView from 'react-native-pager-view';
import { COLORS } from '../../../core/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
const DEFAULT_STORY_DURATION = 10000; // 10 seconds for images
const HOLD_PAUSE_DELAY = 200;

interface FlyingEmojiData {
    id: string;
    emoji: string;
    x: number;
    y: number;
}

interface StoryViewerProps {
    stories: Story[];
    initialIndex?: number;
}

export function StoryViewer({ stories, initialIndex = 0 }: StoryViewerProps) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const pagerRef = useRef<PagerView>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isPaused, setIsPaused] = useState(false);
    const [isLiked, setIsLiked] = useState(stories[initialIndex]?.isLiked || false);
    const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmojiData[]>([]);
    const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 🔥 FIX: Track video durations for each story
    const videoDurationsRef = useRef<{ [storyId: string]: number }>({});
    const [videoDuration, setVideoDuration] = useState(0);

    // 🔥 FIX: Track video refs for seeking
    const videoRefs = useRef<{ [storyId: string]: any }>({});

    // Progress bar - smooth animation system (like feed seekbar)
    const rawProgress = useSharedValue(0); // Raw progress from video
    const progress = useSharedValue(0); // Smoothed progress for UI

    // 🔥 Initialize duration for initial story if already cached
    useEffect(() => {
        const initialStory = stories[currentIndex];
        const cachedDuration = videoDurationsRef.current[initialStory?.id];
        if (cachedDuration && videoDuration === 0) {
            setVideoDuration(cachedDuration);
        }
    }, [currentIndex, stories, videoDuration]);

    // 🔥 Smooth progress animation (prevents stuttering)
    useAnimatedReaction(
        () => ({
            raw: rawProgress.value,
            paused: isPaused
        }),
        (result, prevResult) => {
            if (result.paused) {
                return; // Don't update when paused
            }

            const targetProgress = result.raw;

            // Check if this is a continuous update (not a seek/jump)
            let isContinuous = false;
            if (prevResult && !prevResult.paused) {
                const diff = Math.abs(targetProgress - prevResult.raw);
                if (diff < 0.1) { // Small incremental change = smooth it
                    isContinuous = true;
                }
            }

            if (isContinuous) {
                // Smooth animation for continuous playback
                progress.value = withTiming(targetProgress, {
                    duration: 100, // Smooth interpolation between updates
                    easing: Easing.linear
                });
            } else {
                // Instant update for seeks/jumps
                progress.value = targetProgress;
            }
        },
        [isPaused]
    );

    const handleNext = useCallback(() => {
        if (currentIndex < stories.length - 1) {
            pagerRef.current?.setPage(currentIndex + 1);
        } else {
            router.back();
        }
    }, [currentIndex, stories.length, router]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            pagerRef.current?.setPage(currentIndex - 1);
        }
    }, [currentIndex]);

    const handleClose = useCallback(() => {
        router.back();
    }, [router]);

    // 🔥 FIX: Handle video load to get actual duration
    const handleVideoLoad = useCallback((storyId: string, storyIndex: number) => (data: any) => {
        const durationMs = (data.duration || 10) * 1000; // Convert to ms

        // Cache duration for this story
        videoDurationsRef.current[storyId] = durationMs;

        // If this is the current story, update state
        if (storyIndex === currentIndex) {
            setVideoDuration(durationMs);
        }
    }, [currentIndex]);

    // 🔥 FIX: Sync progress with video playback
    const handleVideoProgress = useCallback((data: any) => {
        if (videoDuration > 0 && !isPaused) {
            const currentProgress = data.currentTime / (videoDuration / 1000);
            rawProgress.value = Math.min(currentProgress, 1); // Update raw, smoothing happens in reaction
        }
    }, [videoDuration, isPaused, rawProgress]);

    // 🔥 FIX: Handle video end
    const handleVideoEnd = useCallback(() => {
        handleNext();
    }, [handleNext]);

    const handlePageSelected = useCallback((e: any) => {
        const newIndex = e.nativeEvent.position;
        const newStory = stories[newIndex];
        const prevStory = stories[currentIndex];

        // 🔥 Reset previous video to start (prevents memory buildup)
        if (prevStory && videoRefs.current[prevStory.id]) {
            videoRefs.current[prevStory.id]?.seek(0);
        }

        // 🔥 Reset new story to start (ensures fresh playback)
        setTimeout(() => {
            if (newStory && videoRefs.current[newStory.id]) {
                videoRefs.current[newStory.id]?.seek(0);
            }
        }, 100); // Small delay to ensure video ref is ready

        setCurrentIndex(newIndex);
        setIsLiked(newStory?.isLiked || false);
        rawProgress.value = 0;
        progress.value = 0;

        // Check if we already have cached duration for this story
        const cachedDuration = videoDurationsRef.current[newStory.id];
        if (cachedDuration) {
            setVideoDuration(cachedDuration);
        } else {
            setVideoDuration(0);
        }
    }, [stories, currentIndex, rawProgress, progress]);

    // Tap handlers
    const handleHoldStart = useCallback(() => {
        holdTimeoutRef.current = setTimeout(() => {
            setIsPaused(true);
        }, HOLD_PAUSE_DELAY);
    }, []);

    const handleHoldEnd = useCallback(() => {
        if (holdTimeoutRef.current) {
            clearTimeout(holdTimeoutRef.current);
            holdTimeoutRef.current = null;
        }
        if (isPaused) {
            setIsPaused(false);
        }
    }, [isPaused]);

    const handleTapLeft = useCallback(() => {
        handlePrev();
    }, [handlePrev]);

    const handleTapRight = useCallback(() => {
        handleNext();
    }, [handleNext]);

    // Actions
    const handleLike = useCallback(() => setIsLiked(prev => !prev), []);
    const handleShare = useCallback(() => console.log('Share story'), []);

    const handleEmojiSelect = useCallback((emoji: string) => {
        const newEmoji: FlyingEmojiData = {
            id: Date.now().toString(),
            emoji,
            x: Math.random() * 200 + 100,
            y: SCREEN_HEIGHT * 0.5,
        };
        setFlyingEmojis(prev => [...prev, newEmoji]);
        setTimeout(() => {
            setFlyingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
        }, 2000);
    }, []);

    const activeStory = stories[currentIndex];

    return (
        <View style={styles.container}>
            {/* Blurred Background - Static */}
            <ImageBackground
                source={{ uri: activeStory?.thumbnailUrl }}
                style={StyleSheet.absoluteFill}
                blurRadius={50}
            >
                <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            </ImageBackground>

            {/* Top Spacer */}
            <View style={{ height: insets.top + 30, backgroundColor: '#000000', width: '100%' }} />

            {/* Video Layer - Only videos inside PagerView */}
            <View style={styles.videoArea}>
                <PagerView
                    ref={pagerRef}
                    style={StyleSheet.absoluteFill}
                    initialPage={initialIndex}
                    onPageSelected={handlePageSelected}
                    orientation="horizontal"
                    overdrag={false}
                    scrollEnabled={true}
                >
                    {stories.map((story, index) => (
                        <View key={story.id} style={styles.page}>
                            <Video
                                ref={(ref) => { videoRefs.current[story.id] = ref; }}
                                key={`video-${story.id}`}
                                source={{ uri: story.videoUrl }}
                                style={styles.video}
                                resizeMode="contain"
                                repeat={false}
                                paused={isPaused || index !== currentIndex}
                                muted={false}
                                progressUpdateInterval={50}
                                onLoad={handleVideoLoad(story.id, index)}
                                onProgress={index === currentIndex ? handleVideoProgress : undefined}
                                onEnd={index === currentIndex ? handleVideoEnd : undefined}
                            />
                        </View>
                    ))}
                </PagerView>

                {/* Tap Zones - Over videos */}
                <View style={styles.tapZones} pointerEvents="box-none">
                    <Pressable
                        style={styles.leftZone}
                        onPress={handleTapLeft}
                        onPressIn={handleHoldStart}
                        onPressOut={handleHoldEnd}
                    />
                    <Pressable
                        style={styles.rightZone}
                        onPress={handleTapRight}
                        onPressIn={handleHoldStart}
                        onPressOut={handleHoldEnd}
                    />
                </View>
            </View>

            {/* STATIC UI - Header (absolute, stays on swipe) */}
            <StoryHeader
                story={activeStory}
                progress={progress}
                totalStories={stories.length}
                currentStoryIndex={currentIndex}
                onClose={handleClose}
            />

            {/* STATIC UI - Actions (relative, pushes video) */}
            <StoryActions
                isLiked={isLiked}
                onLike={handleLike}
                onShare={handleShare}
                onEmojiSelect={handleEmojiSelect}
            />

            {/* Flying Emojis */}
            {flyingEmojis.map((emojiData) => (
                <FlyingEmoji
                    key={emojiData.id}
                    emoji={emojiData.emoji}
                    startX={emojiData.x}
                    startY={emojiData.y}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.videoBackground,
    },
    videoArea: {
        flex: 1,
        backgroundColor: '#000000',
    },
    page: {
        flex: 1,
        backgroundColor: '#000000',
    },
    video: {
        flex: 1,
        backgroundColor: '#000000',
    },
    tapZones: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        zIndex: 10,
    },
    leftZone: {
        flex: 0.3,
    },
    rightZone: {
        flex: 0.7,
    },
});
