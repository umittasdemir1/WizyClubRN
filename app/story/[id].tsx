import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStoryViewer } from '../../src/presentation/hooks/useStoryViewer';
import { ProgressBar } from '../../src/presentation/components/story/ProgressBar';
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Avatar } from '../../src/presentation/components/shared/Avatar';
import { X } from 'lucide-react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

const STORY_DURATION = 5000; // 5 seconds
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Buffer config for partial load speed
const BUFFER_CONFIG = {
    minBufferMs: 1000,
    maxBufferMs: 5000,
    bufferForPlaybackMs: 100,
    bufferForPlaybackAfterRebufferMs: 250,
};

export default function StoryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { currentStory, isLoading, goToNext, goToPrev } = useStoryViewer(id);
    const [progressKey, setProgressKey] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const videoRef = useRef<Video>(null);

    // Animation values
    const translateY = useSharedValue(0);

    // Auto-advance
    useEffect(() => {
        const timer = setTimeout(() => {
            goToNext();
        }, STORY_DURATION);

        return () => clearTimeout(timer);
    }, [currentStory, goToNext]);

    // Reset progress bar on story change
    useEffect(() => {
        setProgressKey(prev => prev + 1);
        setIsPaused(false);
    }, [currentStory]);

    const handleClose = () => {
        router.back();
    };

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (event.translationY > 0) {
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            if (event.translationY > 100) {
                runOnJS(handleClose)();
            } else {
                translateY.value = withTiming(0);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    if (isLoading || !currentStory) {
        return <View style={styles.container} />;
    }

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.container, animatedStyle]}>
                {/* Video Background */}
                <Video
                    ref={videoRef}
                    source={typeof currentStory.videoUrl === 'string'
                        ? { uri: currentStory.videoUrl }
                        : currentStory.videoUrl}
                    style={styles.video}
                    resizeMode="cover"
                    repeat={false}
                    paused={isPaused}
                    bufferConfig={BUFFER_CONFIG}
                // No separate onProgress needed unless creating custom progress logic 
                // (we actally rely on Timer for simple story progress here, 
                // though syncing with actual video progress is better for buffering)
                // For now keeping simple timer-based approach as per original code structure
                />

                {/* Overlay Content */}
                <View style={[styles.overlay, { paddingTop: insets.top + 10 }]}>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <ProgressBar
                            key={progressKey}
                            duration={STORY_DURATION}
                            isActive={true}
                            progress={1}
                            onFinish={goToNext}
                        />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.userInfo}>
                            <Avatar url={currentStory.user.avatarUrl} size={32} />
                            <Text style={styles.username}>{currentStory.user.username}</Text>
                            <Text style={styles.time}>2h</Text>
                        </View>

                        <Pressable onPress={handleClose} style={styles.closeButton}>
                            <X color="white" size={24} />
                        </Pressable>
                    </View>
                </View>

                {/* Tap Zones */}
                <View style={styles.tapZones}>
                    <Pressable style={styles.leftZone} onPress={goToPrev} />
                    <Pressable style={styles.rightZone} onPress={goToNext} />
                </View>
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
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 8,
        zIndex: 10,
    },
    progressContainer: {
        flexDirection: 'row',
        height: 2,
        marginBottom: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    username: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    time: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
    },
    closeButton: {
        padding: 4,
    },
    tapZones: {
        position: 'absolute',
        top: 100, // Below header
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        zIndex: 5,
    },
    leftZone: {
        flex: 0.3,
    },
    rightZone: {
        flex: 0.7,
    },
});
