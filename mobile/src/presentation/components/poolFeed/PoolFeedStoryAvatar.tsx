import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { StoryRingAvatar } from '../shared/StoryRingAvatar';
import { useStoryStore } from '../../store/useStoryStore';

const AVATAR_SIZE = 64;
// Desired specs: 3px thickness, 3px gap
const THICKNESS = 1.5;
const GAP = 1.5;
const RING_SIZE = AVATAR_SIZE + (THICKNESS * 2) + (GAP * 2); // 64 + 6 + 6 = 76

interface PoolFeedStoryAvatarProps {
    userId: string;
    username: string;
    avatarUrl: string;
    hasUnseenStory: boolean;
    onPress: () => void;
}

export const PoolFeedStoryAvatar = memo(function PoolFeedStoryAvatar({
    userId,
    username,
    avatarUrl,
    hasUnseenStory,
    onPress,
}: PoolFeedStoryAvatarProps) {
    // Reactive selector: re-renders only when this specific user's status changes
    const isViewedLocal = useStoryStore((state) => state.viewedUserIds.has(userId));
    
    // If hasUnseenStory is false (backend says viewed), it's viewed.
    // If local store says viewed (just watched), it's viewed.
    const isViewed = !hasUnseenStory || isViewedLocal;

    return (
        <Pressable onPress={onPress} style={styles.container}>
            <View style={styles.avatarContainer}>
                <StoryRingAvatar
                    avatarUrl={avatarUrl}
                    avatarSize={AVATAR_SIZE}
                    hasActiveStory={true}
                    isViewed={isViewed}
                    showViewedRingWhenNoStory={true}
                    thickness={THICKNESS}
                    gap={GAP}
                />
            </View>
            <Text style={styles.username} numberOfLines={1}>
                {username}
            </Text>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginHorizontal: 8,
    },
    avatarContainer: {
        marginBottom: 6,
    },
    username: {
        color: 'white',
        fontSize: 11,
        fontWeight: '500',
        maxWidth: RING_SIZE + 8,
        textAlign: 'center',
    },
});
