import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';
import { useUploadStore } from '../../store/useUploadStore';
import { textShadowStyle } from '@/core/utils/shadow';
import { ThemeColors } from './types';
import { InfiniteStoryBar } from './InfiniteStoryBar';

export const FEED_TABS = ['Takipte', 'Sana Özel'] as const;
export type FeedTab = (typeof FEED_TABS)[number];

interface InfiniteFeedHeaderProps {
    activeTab: FeedTab;
    onTabChange: (tab: FeedTab) => void;
    colors: ThemeColors;
    insetTop: number;
    onUploadPress?: () => void;
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
    storyUsers,
    onStoryAvatarPress,
}: InfiniteFeedHeaderProps) {
    const headerTopPadding = insetTop + 12;
    const baseHeight = headerTopPadding + 10;
    const headerMinHeight = baseHeight * 3;
    return (
        <View
            style={[
                styles.header,
                {
                    paddingTop: headerTopPadding - 10,
                    minHeight: headerMinHeight,
                    borderBottomColor: colors.border,
                    backgroundColor: colors.background,
                },
            ]}
        >
            <View style={styles.leftColumn}>
                <UploadButton onPress={onUploadPress} />
                <UploadThumbnail />
            </View>
            <View style={[styles.centerOverlay, { top: headerTopPadding - 10 }]} pointerEvents="box-none">
                <View style={styles.tabContainer}>
                    {FEED_TABS.map((tab, index) => (
                        <React.Fragment key={tab}>
                            <Pressable
                                onPress={() => onTabChange(tab)}
                                style={styles.tabButton}
                                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                            >
                                <Text
                                    style={[
                                        styles.tabText,
                                        activeTab === tab && styles.tabTextActive,
                                        { color: activeTab === tab ? colors.textPrimary : colors.textSecondary },
                                    ]}
                                >
                                    {tab}
                                </Text>
                            </Pressable>
                            {index === 0 ? (
                                <View
                                    style={[
                                        styles.tabDivider,
                                        { backgroundColor: colors.textSecondary },
                                    ]}
                                />
                            ) : null}
                        </React.Fragment>
                    ))}
                </View>
            </View>
            <InfiniteStoryBar
                storyUsers={storyUsers}
                onAvatarPress={onStoryAvatarPress}
                backgroundColor={colors.background}
            />
        </View>
    );
}

function UploadButton({ onPress }: { onPress?: () => void }) {
    const status = useUploadStore(state => state.status);
    const isProcessing = status === 'compressing' || status === 'uploading' || status === 'processing';

    if (!onPress || isProcessing) return null;

    return (
        <Pressable
            style={styles.iconButton}
            onPress={onPress}
            hitSlop={12}
        >
            <Plus width={28} height={28} color="#FFFFFF" />
        </Pressable>
    );
}

function UploadThumbnail() {
    const thumbnailUri = useUploadStore(state => state.thumbnailUri);
    const progress = useUploadStore(state => state.progress);
    const status = useUploadStore(state => state.status);
    const isProcessing = status === 'compressing' || status === 'uploading' || status === 'processing';

    if (!thumbnailUri || !isProcessing) return null;

    return (
        <View style={thumbnailStyles.container}>
            <ExpoImage
                source={{ uri: thumbnailUri }}
                style={thumbnailStyles.image}
                contentFit="cover"
            />
            <View style={thumbnailStyles.overlay}>
                <Text style={thumbnailStyles.percentText}>%{Math.round(progress)}</Text>
            </View>
        </View>
    );
}

const thumbnailStyles = StyleSheet.create({
    container: {
        width: 48,
        height: 85,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
        marginTop: 4,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        ...textShadowStyle('rgba(0, 0, 0, 0.75)', { width: 0, height: 1 }, 3),
    },
});

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 16,
        paddingBottom: 0,
        alignItems: 'flex-start',
        position: 'relative',
    },
    leftColumn: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        marginLeft: -10,
    },
    centerOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        top: 0,
    },
    tabContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 18,
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
        marginTop: -3,
    },
});
