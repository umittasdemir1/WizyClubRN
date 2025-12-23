import React, { memo, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { StoryAvatar } from './StoryAvatar';
import { BlurView } from 'expo-blur';

const SCREEN_WIDTH = Dimensions.get('window').width;
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
}

export const StoryBar = memo(function StoryBar({
    isVisible,
    storyUsers,
    onAvatarPress,
}: StoryBarProps) {
    const insets = useSafeAreaInsets();
    const translateY = useSharedValue(-BAR_HEIGHT);
    const opacity = useSharedValue(0);
    const [shouldRender, setShouldRender] = useState(false);

    // Slide down/up animasyonu
    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            translateY.value = withSpring(0, {
                damping: 20,
                stiffness: 120,
            });
            opacity.value = withTiming(1, { duration: 200 });
        } else {
            translateY.value = withTiming(-BAR_HEIGHT, { duration: 250 });
            opacity.value = withTiming(0, { duration: 200 });
            // Delay unmount until animation completes
            setTimeout(() => setShouldRender(false), 250);
        }
    }, [isVisible]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: opacity.value,
    }));

    // İzlenmemiş hikayeleri öne al
    const sortedUsers = useMemo(() => {
        return [...storyUsers].sort((a, b) => {
            if (a.hasUnseenStory && !b.hasUnseenStory) return -1;
            if (!a.hasUnseenStory && b.hasUnseenStory) return 1;
            return 0;
        });
    }, [storyUsers]);

    if (!shouldRender) {
        return null; // Performans için unmount
    }

    return (
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
