import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';
import { StoryRingAvatar } from '../shared/StoryRingAvatar';

const AVATAR_SIZE = 72;
const THICKNESS = 1.5;
const GAP = 1.5;
const RING_SIZE = AVATAR_SIZE + (THICKNESS * 2) + (GAP * 2);
const CREATE_BUTTON_SIZE = 24;
const CREATE_ICON_SIZE = 16;

interface InfiniteStoryAvatarProps {
    userId: string;
    username: string;
    avatarUrl: string;
    hasStory?: boolean;
    hasUnseenStory: boolean;
    textColor?: string;
    showCreateButton?: boolean;
    onCreatePress?: () => void;
    onPress: () => void;
}

export const InfiniteStoryAvatar = memo(function InfiniteStoryAvatar({
    userId,
    username,
    avatarUrl,
    hasStory = true,
    hasUnseenStory,
    textColor,
    showCreateButton = false,
    onCreatePress,
    onPress,
}: InfiniteStoryAvatarProps) {
    const ringViewed = !hasStory;
    const shouldShowCreateButton = showCreateButton && Boolean(onCreatePress);

    return (
        <Pressable onPress={onPress} style={styles.container}>
            <View style={styles.avatarContainer}>
                <View style={styles.avatarFrame}>
                    <StoryRingAvatar
                        avatarUrl={avatarUrl}
                        avatarSize={AVATAR_SIZE}
                        hasActiveStory={hasStory}
                        isViewed={ringViewed}
                        showViewedRingWhenNoStory={true}
                        thickness={THICKNESS}
                        gap={GAP}
                    />
                </View>
                {shouldShowCreateButton ? (
                    <Pressable
                        onPress={(event) => {
                            event.stopPropagation();
                            onCreatePress?.();
                        }}
                        hitSlop={8}
                        style={styles.createButton}
                    >
                        <Plus size={CREATE_ICON_SIZE} color="#080A0F" strokeWidth={2.8} />
                    </Pressable>
                ) : null}
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
        position: 'relative',
    },
    avatarFrame: {
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createButton: {
        position: 'absolute',
        right: -3,
        bottom: 5,
        width: CREATE_BUTTON_SIZE,
        height: CREATE_BUTTON_SIZE,
        borderRadius: CREATE_BUTTON_SIZE / 2,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#080A0F',
    },
    username: {
        color: 'white',
        fontSize: 11,
        fontWeight: '500',
        maxWidth: RING_SIZE + 8,
        textAlign: 'center',
    },
});
