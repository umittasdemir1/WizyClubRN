import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import VideoPlayer from 'react-native-video';
import { getVideoUrl } from '../../../core/utils/videoUrl';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import { InfiniteFeedActions } from './InfiniteFeedActions';
import { ThemeColors } from './types';
import { FEED_FLAGS } from '../feed/hooks/useFeedConfig';

const DESCRIPTION_LIMIT = 70;
const CARD_HORIZONTAL_PADDING = 16;

interface InfiniteFeedCardProps {
    item: VideoEntity;
    index: number;
    colors: ThemeColors;
    isActive: boolean;
    isMuted: boolean;
    onOpen: (id: string, index: number) => void;
    onLike: (id: string) => void;
    onSave: (id: string) => void;
    onShare: (id: string) => void;
    onShop: (id: string) => void;
}

export const InfiniteFeedCard = React.memo(function InfiniteFeedCard({
    item,
    index,
    colors,
    isActive,
    isMuted,
    onOpen,
    onLike,
    onSave,
    onShare,
    onShop,
}: InfiniteFeedCardProps) {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

    // ✅ FLAG CONTROLS
    const disableAllUI = FEED_FLAGS.INF_DISABLE_ALL_UI;
    const disableInlineVideo = FEED_FLAGS.INF_DISABLE_INLINE_VIDEO;
    const disableUserHeader = FEED_FLAGS.INF_DISABLE_USER_HEADER || disableAllUI;
    const disableActions = FEED_FLAGS.INF_DISABLE_ACTIONS || disableAllUI;
    const disableDescription = FEED_FLAGS.INF_DISABLE_DESCRIPTION || disableAllUI;
    const disableThumbnail = FEED_FLAGS.INF_DISABLE_THUMBNAIL;

    const thumbnail = useMemo(() => {
        if (item.thumbnailUrl) return item.thumbnailUrl;
        const fallback = item.mediaUrls?.[0];
        return fallback?.thumbnail || fallback?.url || '';
    }, [item.mediaUrls, item.thumbnailUrl]);

    const videoUrl = getVideoUrl(item);
    const isVideo = item.postType !== 'carousel' && !!videoUrl;
    // ✅ VIDEO FLAG: If disabled, never render video (only thumbnail)
    const shouldRenderVideo = isVideo && isActive && !disableInlineVideo;
    const hasMedia = isVideo || Boolean(thumbnail);
    const hasThumbnail = Boolean(thumbnail);
    const aspectRatio = useMemo(() => {
        if (item.width && item.height && item.width > 0 && item.height > 0) {
            return item.width / item.height;
        }
        return 1;
    }, [item.width, item.height]);

    // ✅ [PERF] Stabilize callbacks to prevent InfiniteFeedActions re-renders
    const handleOpen = useCallback(() => {
        onOpen(item.id, index);
    }, [item.id, index, onOpen]);

    const handleLike = useCallback(() => {
        onLike(item.id);
    }, [item.id, onLike]);

    const handleSave = useCallback(() => {
        onSave(item.id);
    }, [item.id, onSave]);

    const handleShare = useCallback(() => {
        onShare(item.id);
    }, [item.id, onShare]);

    const handleShop = useCallback(() => {
        onShop(item.id);
    }, [item.id, onShop]);

    // ✅ [PERF] Memoize dynamic styles to prevent object reference churn
    const mediaWrapperStyle = useMemo(() => [
        styles.mediaWrapper,
        { aspectRatio }
    ], [aspectRatio]);

    const fullNameStyle = useMemo(() => [
        styles.fullName,
        { color: colors.textPrimary }
    ], [colors.textPrimary]);

    const handleStyle = useMemo(() => [
        styles.handle,
        { color: colors.textSecondary }
    ], [colors.textSecondary]);

    const descriptionTextStyle = useMemo(() => [
        styles.description,
        { color: colors.textPrimary }
    ], [colors.textPrimary]);

    const readMoreTextStyle = useMemo(() => [
        styles.readMore,
        { color: colors.textSecondary }
    ], [colors.textSecondary]);

    return (
        <Pressable style={styles.card} onPress={handleOpen}>
            {/* ✅ USER HEADER - Controlled by INF_DISABLE_USER_HEADER */}
            {!disableUserHeader && (
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        {item.user?.avatarUrl ? (
                            <Image source={{ uri: item.user.avatarUrl }} style={styles.avatar} contentFit="cover" />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: colors.card }]} />
                        )}
                        <View style={styles.headerText}>
                            <Text style={fullNameStyle} numberOfLines={1}>
                                {item.user?.fullName || 'WizyClub User'}
                            </Text>
                            <Text style={handleStyle} numberOfLines={1}>
                                @{item.user?.username || 'wizyclub'}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* MEDIA - Video or Image */}
            {isVideo && videoUrl ? (
                <Pressable
                    style={mediaWrapperStyle}
                    onPress={handleOpen}
                >
                    <VideoPlayer
                        source={{ uri: videoUrl }}
                        style={styles.media}
                        resizeMode="contain"
                        repeat={true}
                        paused={!isActive}
                        muted={isMuted}
                        playInBackground={false}
                        playWhenInactive={false}
                        progressUpdateInterval={1000}
                        poster={!disableThumbnail ? thumbnail : undefined}
                        posterResizeMode="cover"
                        bufferConfig={{
                            minBufferMs: 500,
                            maxBufferMs: 2000,
                            bufferForPlaybackMs: 250,
                            bufferForPlaybackAfterRebufferMs: 500,
                        }}
                    />
                </Pressable>
            ) : hasThumbnail ? (
                <Pressable
                    style={mediaWrapperStyle}
                    onPress={handleOpen}
                >
                    <Image source={{ uri: thumbnail }} style={styles.media} contentFit="cover" />
                </Pressable>
            ) : null}

            {/* ✅ ACTIONS - Controlled by INF_DISABLE_ACTIONS */}
            {!disableActions && (
                <View style={styles.cardContent}>
                    <InfiniteFeedActions
                        colors={colors}
                        likesCount={item.likesCount || 0}
                        savesCount={item.savesCount || 0}
                        sharesCount={item.sharesCount || 0}
                        shopsCount={item.shopsCount || 0}
                        isLiked={item.isLiked}
                        isSaved={item.isSaved}
                        showShop={!!item.brandUrl}
                        onLike={handleLike}
                        onSave={handleSave}
                        onShare={handleShare}
                        onShop={handleShop}
                    />
                </View>
            )}

            {/* ✅ DESCRIPTION - Controlled by INF_DISABLE_DESCRIPTION */}
            {!disableDescription && !!item.description && (
                <View style={styles.cardContent}>
                    <Text style={descriptionTextStyle}>
                        {isDescriptionExpanded || item.description.length <= DESCRIPTION_LIMIT
                            ? item.description
                            : item.description.substring(0, DESCRIPTION_LIMIT)}
                        {!isDescriptionExpanded && item.description.length > DESCRIPTION_LIMIT && (
                            <Text
                                style={readMoreTextStyle}
                                onPress={() => setIsDescriptionExpanded(true)}
                            >
                                {'...Daha fazla'}
                            </Text>
                        )}
                        {isDescriptionExpanded && item.description.length > DESCRIPTION_LIMIT && (
                            <Text
                                style={readMoreTextStyle}
                                onPress={() => setIsDescriptionExpanded(false)}
                            >
                                {' Daha az'}
                            </Text>
                        )}
                    </Text>
                </View>
            )}
        </Pressable>
    );
});

const styles = StyleSheet.create({
    card: {
        paddingVertical: 16,
    },
    cardContent: {
        paddingHorizontal: CARD_HORIZONTAL_PADDING,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#2a2a2a',
    },
    headerText: {
        flex: 1,
    },
    fullName: {
        fontSize: 15,
        fontWeight: '700',
    },
    handle: {
        fontSize: 13,
        marginTop: 2,
    },
    description: {
        fontSize: 15,
        lineHeight: 20,
        marginTop: 10,
    },
    readMore: {
        fontSize: 14,
        fontWeight: '600',
    },
    mediaWrapper: {
        marginTop: 12,
        width: '100%',
        borderRadius: 0,
        borderWidth: 0,
    },
    media: {
        width: '100%',
        height: '100%',
        backgroundColor: '#111',
    },
    mediaPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#111',
    },
});
