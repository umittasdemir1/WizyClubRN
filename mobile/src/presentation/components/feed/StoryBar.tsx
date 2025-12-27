import React, { memo, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { StoryAvatar } from './StoryAvatar';
import { BlurView } from 'expo-blur';

const BAR_HEIGHT = 110;

interface StoryUser {
    id: string;
    username: string;
    avatarUrl: string;
    hasUnseenStory: boolean;
}

interface StoryBarProps {
    isVisible: boolean;
    storyUsers: StoryUser[];
    onAvatarPress: (userId: string) => void;
    onClose: () => void;
}

export const StoryBar = memo(function StoryBar({
    isVisible,
    storyUsers,
    onAvatarPress,
    onClose,
}: StoryBarProps) {
    const insets = useSafeAreaInsets();
    const translateY = useSharedValue(-BAR_HEIGHT);
    const opacity = useSharedValue(0);
    const [shouldRender, setShouldRender] = useState(false);

    // Slide down/up animasyonu
    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            translateY.value = withTiming(0, { duration: 300 });
            opacity.value = withTiming(1, { duration: 250 });
        } else {
            // Kapanırken bitiş callback'i kullanıyoruz
            opacity.value = withTiming(0, { duration: 200 });
            translateY.value = withTiming(-BAR_HEIGHT, { duration: 250 }, (finished) => {
                if (finished) {
                    runOnJS(setShouldRender)(false);
                }
            });
        }
    }, [isVisible]);

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (event.translationY < 0) {
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            // Yukarı yeterince hızlı veya yeterince çok çekilirse
            if (event.translationY < -30 || event.velocityY < -500) {
                // Kapanma animasyonunu başlat
                opacity.value = withTiming(0, { duration: 200 });
                translateY.value = withTiming(-BAR_HEIGHT, { duration: 250 }, (finished) => {
                    if (finished) {
                        runOnJS(setShouldRender)(false);
                        runOnJS(onClose)(); // Video ancak şimdi başlayabilir
                    }
                });
            } else {
                // Yeterli değilse geri yerine oturt
                translateY.value = withTiming(0, { duration: 200 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    const sortedUsers = useMemo(() => {
        return [...storyUsers].sort((a, b) => {
            if (a.hasUnseenStory && !b.hasUnseenStory) return -1;
            if (!a.hasUnseenStory && b.hasUnseenStory) return 1;
            return 0;
        });
    }, [storyUsers]);

    if (!shouldRender) return null;

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View
                style={[
                    styles.container,
                    {
                        paddingTop: insets.top,
                        height: BAR_HEIGHT + insets.top,
                    },
                    animatedStyle,
                ]}
                pointerEvents={isVisible ? 'auto' : 'none'}
            >
                <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={styles.content}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        decelerationRate="fast"
                    >
                        {sortedUsers.map((user) => (
                            <StoryAvatar
                                key={user.id}
                                username={user.username}
                                avatarUrl={user.avatarUrl}
                                hasUnseenStory={user.hasUnseenStory}
                                onPress={() => onAvatarPress(user.id)}
                            />
                        ))}
                    </ScrollView>
                </View>
            </Animated.View>
        </GestureDetector>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: 8,
        alignItems: 'center',
    },
});

