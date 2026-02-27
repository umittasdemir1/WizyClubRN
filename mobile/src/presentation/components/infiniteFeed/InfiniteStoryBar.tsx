import React, { memo, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { InfiniteStoryAvatar } from './InfiniteStoryAvatar';
import { useAuthStore } from '../../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/core/query/queryClient';
import { ProfileRepositoryImpl } from '@/data/repositories/ProfileRepositoryImpl';

const BAR_HEIGHT = 110;
const DEFAULT_AVATAR = ''; // Removed external UI-Avatars fallback
const profileRepo = new ProfileRepositoryImpl();

interface StoryUser {
    id: string;
    username: string;
    avatarUrl: string;
    hasUnseenStory: boolean;
    hasStory?: boolean;
}

interface InfiniteStoryBarProps {
    storyUsers: StoryUser[];
    onAvatarPress: (userId: string) => void;
    onCreateStoryPress?: () => void;
    backgroundColor?: string;
    textColor?: string;
}

export const InfiniteStoryBar = memo(function InfiniteStoryBar({
    storyUsers,
    onAvatarPress,
    onCreateStoryPress,
    backgroundColor,
    textColor,
}: InfiniteStoryBarProps) {
    const { user: authUser } = useAuthStore();
    // Uses the SAME query key as the prefetch in _layout.tsx
    // If already prefetched, returns cached data instantly (no network request)
    const { data: profileUser } = useQuery({
        queryKey: QUERY_KEYS.PROFILE(authUser?.id || ''),
        queryFn: () => profileRepo.getProfile(authUser?.id || ''),
        enabled: Boolean(authUser?.id),
        staleTime: 1000 * 60, // matches prefetch staleTime
    });

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
        let users: StoryUser[] = storyUsers.map((user) => ({
            ...user,
            hasStory: true,
        }));

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
                : '';

            users.unshift({
                id: currentUserDisplay.id,
                username: 'Hikayen',
                avatarUrl: displayAvatar,
                hasUnseenStory: selfInList ? selfInList.hasUnseenStory : false,
                // Source of truth: current stories list only.
                // Avoid profile.hasStories cache lag after delete.
                hasStory: Boolean(selfInList),
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
                    {sortedUsers.map((item) => {
                        const isCurrentUser = Boolean(currentUserDisplay && item.id === currentUserDisplay.id);
                        return (
                            <InfiniteStoryAvatar
                                key={item.id}
                                userId={item.id}
                                username={item.username}
                                avatarUrl={item.avatarUrl}
                                hasStory={item.hasStory}
                                hasUnseenStory={item.hasUnseenStory}
                                textColor={textColor}
                                showCreateButton={isCurrentUser}
                                onCreatePress={onCreateStoryPress}
                                onPress={() => {
                                    if (!item.hasStory) {
                                        // If current user has no story, open upload camera in story-only mode
                                        if (isCurrentUser && onCreateStoryPress) {
                                            onCreateStoryPress();
                                        }
                                        return;
                                    }
                                    onAvatarPress(item.id);
                                }}
                            />
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: BAR_HEIGHT,
        backgroundColor: '#080A0F',
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
