import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Bookmark, Share2, ShoppingBag, Smile } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface StoryActionsProps {
    isLiked: boolean;
    isSaved: boolean;
    showEmojiPicker: boolean;
    hasShop: boolean;
    onLike: () => void;
    onSave: () => void;
    onShare: () => void;
    onShop: () => void;
    onEmojiPickerToggle: () => void;
    onEmojiSelect: (emoji: string) => void;
}

const EMOJIS = ['❤️', '🔥', '👏', '😂', '😍', '🎉', '👍', '💯'];

export function StoryActions({
    isLiked,
    isSaved,
    showEmojiPicker,
    hasShop,
    onLike,
    onSave,
    onShare,
    onShop,
    onEmojiPickerToggle,
    onEmojiSelect,
}: StoryActionsProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
            {/* Emoji Picker */}
            {showEmojiPicker && (
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(200)}
                    style={styles.emojiPicker}
                >
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.emojiScrollContent}
                    >
                        {EMOJIS.map((emoji) => (
                            <Pressable
                                key={emoji}
                                onPress={() => onEmojiSelect(emoji)}
                                style={styles.emojiButton}
                            >
                                <Text style={styles.emoji}>{emoji}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </Animated.View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
                <Pressable onPress={onLike} style={styles.actionButton} hitSlop={12}>
                    <Heart
                        size={28}
                        color={isLiked ? '#FF3B30' : 'white'}
                        fill={isLiked ? '#FF3B30' : 'transparent'}
                    />
                </Pressable>

                <Pressable onPress={onSave} style={styles.actionButton} hitSlop={12}>
                    <Bookmark
                        size={28}
                        color={isSaved ? '#FFD700' : 'white'}
                        fill={isSaved ? '#FFD700' : 'transparent'}
                    />
                </Pressable>

                <Pressable onPress={onEmojiPickerToggle} style={styles.actionButton} hitSlop={12}>
                    <Smile size={28} color={showEmojiPicker ? '#FFD700' : 'white'} />
                </Pressable>

                <Pressable onPress={onShare} style={styles.actionButton} hitSlop={12}>
                    <Share2 size={28} color="white" />
                </Pressable>

                {hasShop && (
                    <Pressable onPress={onShop} style={styles.shopButton} hitSlop={12}>
                        <ShoppingBag size={20} color="white" />
                        <Text style={styles.shopText}>Mağaza</Text>
                    </Pressable>
                )}
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
    },
    emojiPicker: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 24,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingVertical: 8,
    },
    emojiScrollContent: {
        paddingHorizontal: 12,
        gap: 8,
    },
    emojiButton: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emoji: {
        fontSize: 32,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        paddingHorizontal: 16,
    },
    actionButton: {
        padding: 8,
    },
    shopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    shopText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});
