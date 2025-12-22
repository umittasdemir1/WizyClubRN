import React, { useState, useRef, useEffect, useCallback, ComponentRef } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import Video from 'react-native-video';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { Story } from '../../../domain/entities/Story';
import { StoryHeader } from './StoryHeader';
import { StoryActions } from './StoryActions';
import { FlyingEmoji } from './FlyingEmoji';

const STORY_DURATION = 5000; // 5 seconds
const HOLD_PAUSE_DELAY = 200; // 200ms like Instagram
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
    const videoRef = useRef<ComponentRef<typeof Video>>(null);
    const [progress, setProgress] = useState(0);
    const [isLiked, setIsLiked] = useState(story.isLiked || false);
    const [isSaved, setIsSaved] = useState(story.isSaved || false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmojiData[]>([]);
    const [resizeMode, setResizeMode] = useState<'cover' | 'contain'>('cover');

    const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const translateY = useSharedValue(0);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Detect aspect ratio for video sizing (like Instagram/TikTok)
    useEffect(() => {
        if (story.width && story.height) {
            const aspectRatio = story.width / story.height;
            // Vertical videos (< 0.8 aspect ratio) use cover, horizontal use contain
            setResizeMode(aspectRatio < 0.8 ? 'cover' : 'contain');
        }
    }, [story.width, story.height]);

    // Progress tracking
    useEffect(() => {
        if (!isActive || isPaused) {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
            return;
        }

        setProgress(0);
        const startTime = Date.now();

        progressIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min(elapsed / STORY_DURATION, 1);
            setProgress(newProgress);

            if (newProgress >= 1) {
                clearInterval(progressIntervalRef.current!);
                onNext();
            }
        }, 16); // ~60fps

        return () => {
            if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current);
            }
        };
    }, [isActive, isPaused, onNext]);

    // Reset state when story changes
    useEffect(() => {
        if (isActive) {
            setProgress(0);
            setShowEmojiPicker(false);
        }
    }, [story.id, isActive]);

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
        if (!showEmojiPicker) {
            onPrev();
        }
    }, [showEmojiPicker, onPrev]);

    const handleTapRight = useCallback(() => {
        if (!showEmojiPicker) {
            onNext();
        }
    }, [showEmojiPicker, onNext]);

    const handleLike = useCallback(() => {
        setIsLiked(prev => !prev);
        // TODO: Call API to like/unlike
    }, []);

    const handleSave = useCallback(() => {
        setIsSaved(prev => !prev);
        // TODO: Call API to save/unsave
    }, []);

    const handleShare = useCallback(() => {
        // TODO: Implement share functionality
        console.log('Share story');
    }, []);

    const handleShop = useCallback(() => {
        // TODO: Implement shop navigation
        console.log('Open shop:', story.brandUrl);
    }, [story.brandUrl]);

    const handleEmojiSelect = useCallback((emoji: string) => {
        // Create flying emoji at random position
        const newEmoji: FlyingEmojiData = {
            id: Date.now().toString(),
            emoji,
            x: Math.random() * 200 + 100, // Random x between 100-300
            y: SCREEN_HEIGHT * 0.5, // Start from middle
        };
        setFlyingEmojis(prev => [...prev, newEmoji]);

        // Remove emoji after animation completes
        setTimeout(() => {
            setFlyingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
        }, 2000);

        setShowEmojiPicker(false);
    }, []);

    const handleCommercialPress = useCallback(() => {
        // TODO: Show commercial disclosure info
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
                translateY.value = withTiming(0);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.container, animatedStyle]}>
                {/* Video Background */}
                <Video
                    ref={videoRef}
                    source={{ uri: story.videoUrl }}
                    style={styles.video}
                    resizeMode={resizeMode}
                    repeat={false}
                    paused={isPaused || !isActive}
                    muted={false}
                />

                {/* Header with progress bars */}
                <StoryHeader
                    story={story}
                    progress={progress}
                    totalStories={totalStories}
                    currentStoryIndex={currentStoryIndex}
                    onClose={onClose}
                    onCommercialPress={story.isCommercial ? handleCommercialPress : undefined}
                />

                {/* Tap Zones with Hold */}
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

                {/* Bottom Actions */}
                <StoryActions
                    isLiked={isLiked}
                    isSaved={isSaved}
                    showEmojiPicker={showEmojiPicker}
                    hasShop={!!story.brandUrl}
                    onLike={handleLike}
                    onSave={handleSave}
                    onShare={handleShare}
                    onShop={handleShop}
                    onEmojiPickerToggle={() => setShowEmojiPicker(prev => !prev)}
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
        backgroundColor: 'black',
    },
    video: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    tapZones: {
        position: 'absolute',
        top: 100,
        bottom: 100,
        left: 0,
        right: 0,
        flexDirection: 'row',
    },
    leftZone: {
        flex: 0.3,
    },
    rightZone: {
        flex: 0.7,
    },
});
