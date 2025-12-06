import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStoryViewer } from '../../src/presentation/hooks/useStoryViewer';
import { ProgressBar } from '../../src/presentation/components/story/ProgressBar';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import { Avatar } from '../../src/presentation/components/shared/Avatar';
import { X } from 'lucide-react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';

const STORY_DURATION = 5000; // 5 seconds
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function StoryScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { currentStory, isLoading, goToNext, goToPrev } = useStoryViewer(id);
    const [progressKey, setProgressKey] = useState(0);

    // Animation values
    const translateY = useSharedValue(0);

    // Video Player
    const player = useVideoPlayer(currentStory?.videoUrl ?? '', (player) => {
        player.loop = false;
        player.play();
    });

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
        if (currentStory) {
            // @ts-ignore: replaceAsync is needed for iOS to prevent freezing
            if (player.replaceAsync) {
                player.replaceAsync(currentStory.videoUrl);
            } else {
                player.replace(currentStory.videoUrl);
            }
        }
    }, [currentStory, player]);

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
                <VideoView
                    player={player}
                    style={styles.video}
                    contentFit="cover"
                    nativeControls={false}
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
