import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LikeIcon from '../../../../assets/icons/like.svg';
import ShareIcon from '../../../../assets/icons/share.svg';

interface StoryActionsProps {
    isLiked: boolean;
    onLike: () => void;
    onShare: () => void;
    onEmojiSelect: (emoji: string) => void;
}

const EMOJIS = ['❤️', '🔥', '👏', '😂', '😍', '🎉', '👍', '💯', '😮', '🤩', '😎', '🥰', '😘', '🙌', '💪', '✨'];

export function StoryActions({
    isLiked,
    onLike,
    onShare,
    onEmojiSelect,
}: StoryActionsProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]} pointerEvents="box-none">
            <View style={styles.actionBar}>
                {/* Emoji Pill Area */}
                <View style={styles.emojiContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.emojiScrollContent}
                    >
                        {EMOJIS.map((emoji, index) => (
                            <Pressable
                                key={`${emoji}-${index}`}
                                onPress={() => onEmojiSelect(emoji)}
                                style={styles.emojiButton}
                            >
                                <Text style={styles.emoji}>{emoji}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttons}>
                    <Pressable
                        onPress={onLike}
                        style={styles.actionButton}
                        hitSlop={12}
                    >
                        <LikeIcon
                            width={32}
                            height={32}
                            color={isLiked ? '#FF3B30' : '#FFFFFF'}
                        />
                    </Pressable>

                    <Pressable onPress={onShare} style={styles.actionButton} hitSlop={12}>
                        <ShareIcon width={32} height={32} color="#FFFFFF" />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: '#262730',
        paddingTop: 16,
    },
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        height: 80,
    },
    emojiContainer: {
        flex: 1,
        height: 44,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    emojiScrollContent: {
        alignItems: 'center',
        gap: 2,
    },
    emojiButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emoji: {
        fontSize: 24,
    },
    buttons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
