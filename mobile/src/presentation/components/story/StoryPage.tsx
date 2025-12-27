import React, { useState, useRef, useEffect, useCallback, ComponentRef } from 'react';
import { View, StyleSheet, Pressable, Dimensions, ImageBackground } from 'react-native';
import { BlurView } from 'expo-blur';
import Video from 'react-native-video';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    runOnJS,
    cancelAnimation,
    Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Story } from '../../../domain/entities/Story';
import { StoryHeader } from './StoryHeader';
import { StoryActions } from './StoryActions';
import { FlyingEmoji } from './FlyingEmoji';
import { COLORS } from '../../../core/constants';

const STORY_DURATION = 5000; // 5 seconds
const HOLD_PAUSE_DELAY = 200; // 200ms like Instagram
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('screen');

interface StoryPageProps {
    story: Story;
    isActive: boolean;
    isPaused: boolean;
    onNext: () => void;
    onPrev: () => void;
    onClose: () => void;
    onPauseToggle: (paused: boolean) => void;
    totalStories: number;
    currentStoryIndex: number;
}

interface FlyingEmojiData {
    id: string;
    emoji: string;
    x: number;
    y: number;
}

export function StoryPage({
    story,
    isActive,
    isPaused,
    onNext,
    onPrev,
    onClose,
    onPauseToggle,
    totalStories,
    currentStoryIndex,
}: StoryPageProps) {
    const insets = useSafeAreaInsets();
    const videoRef = useRef<ComponentRef<typeof Video>>(null);
    const [isLiked, setIsLiked] = useState(story.isLiked || false);
    const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmojiData[]>([]);
    const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });

    const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const translateY = useSharedValue(0);

    // SharedValue for smooth 60fps progress (no re-renders)
    const progress = useSharedValue(0);

    // Progress tracking - smooth 60fps using Reanimated
    useEffect(() => {
        if (!isActive) {
            cancelAnimation(progress);
            progress.value = 0;
            return;
        }

        if (isPaused) {
            cancelAnimation(progress);
            return;
        }

        const duration = STORY_DURATION * (1 - progress.value);

        progress.value = withTiming(1, {
            duration: duration,
            easing: Easing.linear
        }, (finished) => {
            if (finished) {
                runOnJS(onNext)();
            }
        });

        return () => {
            cancelAnimation(progress);
        };
    }, [isActive, isPaused, onNext, progress]);

    // Video dimensions for aspect ratio
    const handleLoad = useCallback((data: any) => {
        if (data.naturalSize) {
            setVideoDimensions({
                width: data.naturalSize.width,
                height: data.naturalSize.height,
            });
        }
    }, []);

    // Calculate video style based on aspect ratio
    const getVideoStyle = () => {
        if (!videoDimensions.width || !videoDimensions.height) {
            return styles.videoContain; // Default until loaded
        }

        const videoAspect = videoDimensions.width / videoDimensions.height;
        const screenAspect = SCREEN_WIDTH / SCREEN_HEIGHT;

        // Yatay video veya kare -> contain (alt üst siyah)
        if (videoAspect >= 1 || Math.abs(videoAspect - 1) < 0.1) {
            return styles.videoContain;
        }

        // Dikey video -> cover
        return styles.videoCover;
    };

    const handleHoldStart = useCallback(() => {
        holdTimeoutRef.current = setTimeout(() => {
            onPauseToggle(true);
        }, HOLD_PAUSE_DELAY);
    }, [onPauseToggle]);

    const handleHoldEnd = useCallback(() => {
        if (holdTimeoutRef.current) {
            clearTimeout(holdTimeoutRef.current);
            holdTimeoutRef.current = null;
        }
        if (isPaused) {
            onPauseToggle(false);
        }
    }, [isPaused, onPauseToggle]);

    const handleTapLeft = useCallback(() => {
        onPrev();
    }, [onPrev]);

    const handleTapRight = useCallback(() => {
        onNext();
    }, [onNext]);

    const handleLike = useCallback(() => {
        setIsLiked(prev => !prev);
    }, []);

    const handleShare = useCallback(() => {
        console.log('Share story');
    }, []);

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

    const handleCommercialPress = useCallback(() => {
        console.log('Commercial disclosure:', story.commercialType, story.brandName);
    }, [story.commercialType, story.brandName]);

    // Vertical swipe to close
    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (event.translationY > 0) {
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            if (event.translationY > 100) {
                runOnJS(onClose)();
            } else {
                translateY.value = withTiming(0, { duration: 200 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.container, animatedStyle]}>
                {/* Top Spacer for Safe Area (simulating 8mm gap) */}
                <View style={{ height: insets.top + 30, backgroundColor: COLORS.videoBackground, width: '100%' }} />

                {/* Video Container - Fills available space above the bar */}
                <View style={styles.videoContainer}>
                    <Video
                        ref={videoRef}
                        source={{ uri: story.videoUrl }}
                        style={getVideoStyle()}
                        resizeMode="contain"
                        repeat={false}
                        paused={isPaused || !isActive}
                        muted={false}
                        onLoad={handleLoad}
                    />
                    
                    {/* Tap Zones inside video container */}
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

                {/* Header with progress bars (Absolute) */}
                <StoryHeader
                    story={story}
                    progress={progress}
                    totalStories={totalStories}
                    currentStoryIndex={currentStoryIndex}
                    onClose={onClose}
                    onCommercialPress={story.isCommercial ? handleCommercialPress : undefined}
                />

                {/* Bottom Actions (Relative - Pushes video up) */}
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
            </Animated.View>
        </GestureDetector>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.videoBackground,
    },
    videoContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        overflow: 'hidden',
    },
    videoCover: {
        width: SCREEN_WIDTH,
        height: '100%',
    },
    videoContain: {
        width: SCREEN_WIDTH,
        height: '100%',
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
