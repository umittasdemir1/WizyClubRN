import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Avatar } from '../shared/Avatar';
import { AdvancedStoryRing } from '../shared/AdvancedStoryRing';
import { useStoryStore } from '../../store/useStoryStore';

const AVATAR_SIZE = 64;
const THICKNESS = 1.5;
const GAP = 1.5;
const RING_SIZE = AVATAR_SIZE + (THICKNESS * 2) + (GAP * 2);

interface InfiniteStoryAvatarProps {
    userId: string;
    username: string;
    avatarUrl: string;
    hasUnseenStory: boolean;
    textColor?: string;
    onPress: () => void;
}

export const InfiniteStoryAvatar = memo(function InfiniteStoryAvatar({
    userId,
    username,
    avatarUrl,
    hasUnseenStory,
    textColor,
    onPress,
}: InfiniteStoryAvatarProps) {
    const isViewedLocal = useStoryStore((state) => state.viewedUserIds.has(userId));
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
            <Text style={[styles.username, textColor ? { color: textColor } : null]} numberOfLines={1}>
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
