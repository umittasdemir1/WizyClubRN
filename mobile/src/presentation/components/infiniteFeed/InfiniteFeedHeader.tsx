import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useUploadStore } from '../../store/useUploadStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { ThemeColors } from './InfiniteFeedTypes';
import { InfiniteStoryBar } from './InfiniteStoryBar';
import { InfiniteFeedUploadPreview } from './InfiniteFeedUploadPreview';
import NotificationIcon from '../../../../assets/icons/notification.svg';

export const FEED_TABS = ['Takipte', 'Sana \u00d6zel'] as const;
export type FeedTab = (typeof FEED_TABS)[number];
const HEADER_ICON_SIZE = 28;
const NOTIFICATION_ICON_SIZE = 24;

interface InfiniteFeedHeaderProps {
    activeTab: FeedTab;
    onTabChange: (tab: FeedTab) => void;
    colors: ThemeColors;
    insetTop: number;
    onUploadPress?: () => void;
    onCreateStoryPress?: () => void;
    onNotificationPress?: () => void;
    storyUsers: {
        id: string;
        username: string;
        avatarUrl: string;
        hasUnseenStory: boolean;
    }[];
    onStoryAvatarPress: (userId: string) => void;
}

export function InfiniteFeedHeader({
    activeTab,
    onTabChange,
    colors,
    insetTop,
    onUploadPress,
    onCreateStoryPress,
    onNotificationPress,
    storyUsers,
    onStoryAvatarPress,
}: InfiniteFeedHeaderProps) {
    const unreadCount = useNotificationStore((state) => state.unreadCount);
    const [showCount, setShowCount] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowCount(false);
        }, 20000);
        return () => clearTimeout(timer);
    }, []);

    const displayCount = unreadCount > 9 ? '9+' : unreadCount.toString();
    const headerTopPadding = insetTop + 12;
    const baseHeight = headerTopPadding + 10;
    const headerMinHeight = baseHeight * 3;
    const leftTab = FEED_TABS[0];
    const rightTab = FEED_TABS[1];
    return (
        <View
            style={[
                styles.header,
                {
                    paddingTop: 0,
                    minHeight: headerMinHeight,
                    borderBottomColor: colors.border,
                    backgroundColor: colors.background,
                },
            ]}
        >
            <View style={[styles.topRow, { paddingTop: headerTopPadding - 10 }]}>
                <View style={styles.leftTopSlot}>
                    <UploadButton onPress={onUploadPress} color={colors.textPrimary} />
                </View>
                <View style={styles.centerTopSlot} pointerEvents="box-none">
                    <View style={styles.tabContainer}>
                        <View style={styles.tabLeftHalf}>
                            <Pressable
                                onPress={() => onTabChange(leftTab)}
                                style={styles.tabButton}
                                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                            >
                                <Text
                                    style={[
                                        styles.tabText,
                                        activeTab === leftTab && styles.tabTextActive,
                                        { color: activeTab === leftTab ? colors.textPrimary : colors.textSecondary },
                                    ]}
                                >
                                    {leftTab}
                                </Text>
                            </Pressable>
                        </View>
                        <View
                            style={[
                                styles.tabDivider,
                                { backgroundColor: colors.textSecondary },
                            ]}
                        />
                        <View style={styles.tabRightHalf}>
                            <Pressable
                                onPress={() => onTabChange(rightTab)}
                                style={styles.tabButton}
                                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                            >
                                <Text
                                    style={[
                                        styles.tabText,
                                        activeTab === rightTab && styles.tabTextActive,
                                        { color: activeTab === rightTab ? colors.textPrimary : colors.textSecondary },
                                    ]}
                                >
                                    {rightTab}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
                <View style={styles.rightTopSlot} pointerEvents="box-none">
                    <Pressable
                        style={styles.iconButton}
                        onPress={onNotificationPress}
                        hitSlop={12}
                        disabled={!onNotificationPress}
                    >
                        <NotificationIcon width={NOTIFICATION_ICON_SIZE} height={NOTIFICATION_ICON_SIZE} color={colors.textPrimary} />
                        {unreadCount > 0 ? (
                            <View style={[styles.notificationBadge, !showCount && styles.notificationBadgeDot]}>
                                {showCount ? <Text style={styles.notificationBadgeText}>{displayCount}</Text> : null}
                            </View>
                        ) : null}
                    </Pressable>
                </View>
            </View>
            <InfiniteStoryBar
                storyUsers={storyUsers}
                onAvatarPress={onStoryAvatarPress}
                onCreateStoryPress={onCreateStoryPress || onUploadPress}
                backgroundColor={colors.background}
                textColor={colors.textPrimary}
            />
            <InfiniteFeedUploadPreview borderColor={colors.border} />
        </View>
    );
}

function UploadButton({ onPress, color }: { onPress?: () => void; color: string }) {
    const status = useUploadStore(state => state.status);
    const isProcessing = status === 'compressing' || status === 'uploading' || status === 'processing';

    if (!onPress || isProcessing) return null;

    return (
        <Pressable
            style={styles.iconButton}
            onPress={onPress}
            hitSlop={12}
        >
            <Plus width={HEADER_ICON_SIZE} height={HEADER_ICON_SIZE} color={color} />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 16,
        paddingBottom: 0,
        alignItems: 'flex-start',
        position: 'relative',
    },
    topRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
    },
    leftTopSlot: {
        width: 52,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    centerTopSlot: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightTopSlot: {
        width: 52,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    tabContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabLeftHalf: {
        flex: 1,
        alignItems: 'flex-end',
        paddingRight: 8,
    },
    tabRightHalf: {
        flex: 1,
        alignItems: 'flex-start',
        paddingLeft: 8,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 4,
        position: 'relative',
    },
    tabText: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    tabDivider: {
        width: 1,
        height: 12,
        opacity: 0.2,
    },
    iconButton: {
        padding: 8,
        marginTop: 0,
    },
    notificationBadge: {
        position: 'absolute',
        top: 3,
        right: 3,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    notificationBadgeDot: {
        minWidth: 6,
        height: 6,
        borderRadius: 3,
        top: 7,
        right: 7,
        paddingHorizontal: 0,
    },
    notificationBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
});

