import React, { memo, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { StoryAvatar } from './StoryAvatar';
import { useAuthStore } from '../../store/useAuthStore';
import { useProfile } from '../../hooks/useProfile';

const BAR_HEIGHT = 110;
const DEFAULT_AVATAR = 'https://ui-avatars.com/api/?name=Me&background=random&color=fff';

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
    const translateY = useSharedValue(-BAR_HEIGHT - insets.top);
    const opacity = useSharedValue(0);
    const [shouldRender, setShouldRender] = useState(false);
    
    // Auth and Profile Hooks
    const { user: authUser } = useAuthStore();
    const { user: profileUser } = useProfile(authUser?.id || '');

    // Resolve the current user to display
    const currentUser = profileUser || authUser;

    // Debug user data
    useEffect(() => {
        if (isVisible && currentUser) {
            console.log('[StoryBar] Current User:', { id: currentUser.id, username: currentUser.username, avatarUrl: currentUser.avatarUrl });
        }
    }, [isVisible, currentUser]);

    // Slide down/up animasyonu
    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            translateY.value = withTiming(0, { duration: 300 });
            opacity.value = withTiming(1, { duration: 250 });
        } else {
            // Kapanırken bitiş callback'i kullanıyoruz
            opacity.value = withTiming(0, { duration: 200 });
            translateY.value = withTiming(-BAR_HEIGHT - insets.top, { duration: 250 }, (finished) => {
                if (finished) {
                    runOnJS(setShouldRender)(false);
                }
            });
        }
    }, [isVisible, insets.top]);

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
                translateY.value = withTiming(-BAR_HEIGHT - insets.top, { duration: 250 }, (finished) => {
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
        let users = [...storyUsers];

        // Filter out current user from the list if present (to avoid duplication when adding to front)
        if (currentUser) {
            users = users.filter(u => u.id !== currentUser.id);
        }

        users.sort((a, b) => {
            if (a.hasUnseenStory && !b.hasUnseenStory) return -1;
            if (!a.hasUnseenStory && b.hasUnseenStory) return 1;
            return 0;
        });

        // Add current user to the front
        if (currentUser) {
            const selfInList = storyUsers.find(u => u.id === currentUser.id);
            // Use avatarUrl if available, otherwise use default
            const displayAvatar = currentUser.avatarUrl && currentUser.avatarUrl.trim() !== '' 
                ? currentUser.avatarUrl 
                : DEFAULT_AVATAR;

            users.unshift({
                id: currentUser.id,
                username: 'Hikayen',
                avatarUrl: displayAvatar,
                hasUnseenStory: selfInList ? selfInList.hasUnseenStory : false,
            });
        }

        return users;
    }, [storyUsers, currentUser]);

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
                <View style={styles.content}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        decelerationRate="fast"
                    >
                        {sortedUsers.map((item) => (
                            <StoryAvatar
                                key={item.id}
                                userId={item.id}
                                username={item.username}
                                avatarUrl={item.avatarUrl}
                                hasUnseenStory={item.hasUnseenStory}
                                onPress={() => onAvatarPress(item.id)}
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
        backgroundColor: '#000000', // Solid black
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

