import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Story } from '../../../domain/entities/Story';
import { Avatar } from '../shared/Avatar';
import { formatDistanceToNow } from 'date-fns';

interface StoryHeaderProps {
    story: Story;
    progress: number;
    totalStories: number;
    currentStoryIndex: number;
    onClose: () => void;
    onCommercialPress?: () => void;
}

export function StoryHeader({
    story,
    progress,
    totalStories,
    currentStoryIndex,
    onClose,
    onCommercialPress,
}: StoryHeaderProps) {
    const insets = useSafeAreaInsets();

    const getTimeAgo = () => {
        try {
            return formatDistanceToNow(new Date(story.createdAt), { addSuffix: false });
        } catch {
            return '2h';
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
            {/* Progress Bars */}
            <View style={styles.progressContainer}>
                {Array.from({ length: totalStories }).map((_, index) => {
                    let barProgress = 0;
                    if (index < currentStoryIndex) {
                        barProgress = 1;
                    } else if (index === currentStoryIndex) {
                        barProgress = progress;
                    }

                    return (
                        <View key={index} style={styles.progressBarBackground}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${barProgress * 100}%` },
                                ]}
                            />
                        </View>
                    );
                })}
            </View>

            {/* Header Info */}
            <View style={styles.header}>
                <View style={styles.userInfo}>
                    <Avatar url={story.user.avatarUrl} size={32} />
                    <View style={styles.userTextContainer}>
                        <Text style={styles.username}>{story.user.username}</Text>
                        {story.isCommercial && onCommercialPress && (
                            <Pressable onPress={onCommercialPress} style={styles.commercialBadge}>
                                <Text style={styles.commercialText}>
                                    {story.commercialType || 'İş Birliği'}
                                    {story.brandName ? ` | ${story.brandName}` : ''}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                    <Text style={styles.time}>{getTimeAgo()}</Text>
                </View>

                <Pressable onPress={onClose} style={styles.closeButton} hitSlop={12}>
                    <X color="white" size={24} />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingHorizontal: 8,
    },
    progressContainer: {
        flexDirection: 'row',
        gap: 4,
        height: 2,
        marginBottom: 12,
    },
    progressBarBackground: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 1,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    userTextContainer: {
        flexDirection: 'column',
        gap: 2,
    },
    username: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    time: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
    },
    commercialBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    commercialText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600',
    },
    closeButton: {
        padding: 4,
    },
});
