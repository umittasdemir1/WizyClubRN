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
        <View style={[styles.container, { paddingBottom: insets.bottom + 12 }]} pointerEvents="box-none">
            <View style={styles.actionBar}>
                {/* Emoji Scroll Area */}
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
                        style={[styles.actionButton, isLiked && styles.likedButton]}
                        hitSlop={12}
                    >
                        <LikeIcon
                            width={24}
                            height={24}
                            color={isLiked ? '#FF3B30' : '#000000'}
                        />
                    </Pressable>

                    <Pressable onPress={onShare} style={styles.actionButton} hitSlop={12}>
                        <ShareIcon width={24} height={24} color="#000000" />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingHorizontal: 12,
    },
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 30,
        paddingVertical: 8,
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    emojiContainer: {
        flex: 1,
        height: 48,
    },
    emojiScrollContent: {
        alignItems: 'center',
        paddingHorizontal: 8,
        gap: 4,
    },
    emojiButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
    },
    emoji: {
        fontSize: 28,
    },
    buttons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 8,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(0, 0, 0, 0.1)',
    },
    actionButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    likedButton: {
        backgroundColor: '#FFE5E5',
    },
});
