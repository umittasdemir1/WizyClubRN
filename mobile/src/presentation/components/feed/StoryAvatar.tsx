import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Avatar } from '../shared/Avatar';
import { AdvancedStoryRing } from '../shared/AdvancedStoryRing';
import { useStoryStore } from '../../store/useStoryStore';

const AVATAR_SIZE = 64;
// Desired specs: 3px thickness, 3px gap
const THICKNESS = 3;
const GAP = 3;
const RING_SIZE = AVATAR_SIZE + (THICKNESS * 2) + (GAP * 2); // 64 + 6 + 6 = 76

interface StoryAvatarProps {
    userId: string;
    username: string;
    avatarUrl: string;
    hasUnseenStory: boolean;
    onPress: () => void;
}

export const StoryAvatar = memo(function StoryAvatar({
    userId,
    username,
    avatarUrl,
    hasUnseenStory,
    onPress,
}: StoryAvatarProps) {
    // Reactive selector: re-renders only when this specific user's status changes
    const isViewedLocal = useStoryStore((state) => state.viewedUserIds.has(userId));
    
    // If hasUnseenStory is false (backend says viewed), it's viewed.
    // If local store says viewed (just watched), it's viewed.
    const isViewed = !hasUnseenStory || isViewedLocal;

    return (
        <Pressable onPress={onPress} style={styles.container}>
            <View style={styles.avatarContainer}>
                <AdvancedStoryRing 
                    size={RING_SIZE} 
                    thickness={THICKNESS} 
                    gap={GAP} 
                    viewed={isViewed}
                >
                    <Avatar url={avatarUrl} size={AVATAR_SIZE} />
                </AdvancedStoryRing>
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
