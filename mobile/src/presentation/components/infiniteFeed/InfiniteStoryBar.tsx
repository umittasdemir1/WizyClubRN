import React, { memo, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { StoryAvatar } from '../feed/StoryAvatar';
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

interface InfiniteStoryBarProps {
    storyUsers: StoryUser[];
    onAvatarPress: (userId: string) => void;
    backgroundColor?: string;
}

export const InfiniteStoryBar = memo(function InfiniteStoryBar({
    storyUsers,
    onAvatarPress,
    backgroundColor,
}: InfiniteStoryBarProps) {
    const { user: authUser } = useAuthStore();
    const { user: profileUser } = useProfile(authUser?.id || '');

    const currentUserDisplay = useMemo(() => {
        if (profileUser) {
            return {
                id: profileUser.id,
                username: profileUser.username,
                avatarUrl: profileUser.avatarUrl,
            };
        }
        if (authUser) {
            const username = authUser.email?.split('@')[0] || 'me';
            return {
                id: authUser.id,
                username,
                avatarUrl: DEFAULT_AVATAR,
            };
        }
        return null;
    }, [profileUser, authUser]);

    const sortedUsers = useMemo(() => {
        let users = [...storyUsers];

        if (currentUserDisplay) {
            users = users.filter(u => u.id !== currentUserDisplay.id);
        }

        users.sort((a, b) => {
            if (a.hasUnseenStory && !b.hasUnseenStory) return -1;
            if (!a.hasUnseenStory && b.hasUnseenStory) return 1;
            return 0;
        });

        if (currentUserDisplay) {
            const selfInList = storyUsers.find(u => u.id === currentUserDisplay.id);
            const displayAvatar = currentUserDisplay.avatarUrl && currentUserDisplay.avatarUrl.trim() !== ''
                ? currentUserDisplay.avatarUrl
                : DEFAULT_AVATAR;

            users.unshift({
                id: currentUserDisplay.id,
                username: 'Hikayen',
                avatarUrl: displayAvatar,
                hasUnseenStory: selfInList ? selfInList.hasUnseenStory : false,
            });
        }

        return users;
    }, [storyUsers, currentUserDisplay]);

    if (sortedUsers.length === 0) return null;

    return (
        <View style={[styles.container, backgroundColor ? { backgroundColor } : null]}>
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
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: BAR_HEIGHT,
        backgroundColor: '#000000',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: 8,
        alignItems: 'center',
        marginLeft: -10,
    },
});
