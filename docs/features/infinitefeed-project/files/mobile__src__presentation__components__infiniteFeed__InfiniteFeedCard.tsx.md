# mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx

Tekil feed karti: header, medya, aksiyonlar ve aciklama. Sadece aktif item video oynatir.

```tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import VideoPlayer from 'react-native-video';
import { getVideoUrl } from '../../../core/utils/videoUrl';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import { InfiniteFeedActions } from './InfiniteFeedActions';
import { ThemeColors } from './types';

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

    const thumbnail = useMemo(() => {
        if (item.thumbnailUrl) return item.thumbnailUrl;
        const fallback = item.mediaUrls?.[0];
        return fallback?.thumbnail || fallback?.url || '';
    }, [item.mediaUrls, item.thumbnailUrl]);

    const videoUrl = getVideoUrl(item);
    const isVideo = item.postType !== 'carousel' && !!videoUrl;
    const shouldRenderVideo = isVideo && isActive;
    const hasMedia = isVideo || Boolean(thumbnail);
    const hasThumbnail = Boolean(thumbnail);
    const aspectRatio = useMemo(() => {
        if (item.width && item.height && item.width > 0 && item.height > 0) {
            return item.width / item.height;
        }
        return 1;
    }, [item.width, item.height]);

    const handleOpen = () => onOpen(item.id, index);

    return (
        <Pressable style={styles.card} onPress={handleOpen}>
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    {item.user?.avatarUrl ? (
                        <Image source={{ uri: item.user.avatarUrl }} style={styles.avatar} contentFit="cover" />
                    ) : (
                        <View style={[styles.avatar, { backgroundColor: colors.card }]} />
                    )}
                    <View style={styles.headerText}>
                        <Text style={[styles.fullName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {item.user?.fullName || 'WizyClub User'}
                        </Text>
                        <Text style={[styles.handle, { color: colors.textSecondary }]} numberOfLines={1}>
                            @{item.user?.username || 'wizyclub'}
                        </Text>
                    </View>
                </View>
            </View>

            {hasMedia && (
                <Pressable
                    style={[styles.mediaWrapper, { aspectRatio }]}
                    onPress={handleOpen}
                >
                    {shouldRenderVideo && videoUrl ? (
                        <VideoPlayer
                            source={{ uri: videoUrl }}
                            style={styles.media}
                            resizeMode="contain"
                            repeat={true}
                            paused={!isActive}
                            muted={isMuted}
                            poster={thumbnail || undefined}
                            posterResizeMode="cover"
                            playInBackground={false}
                            playWhenInactive={false}
                        />
                    ) : hasThumbnail ? (
                        <Image source={{ uri: thumbnail }} style={styles.media} contentFit="contain" />
                    ) : (
                        <View style={styles.mediaPlaceholder} />
                    )}
                </Pressable>
            )}

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
                    onLike={() => onLike(item.id)}
                    onSave={() => onSave(item.id)}
                    onShare={() => onShare(item.id)}
                    onShop={() => onShop(item.id)}
                />
            </View>

            {!!item.description && (
                <View style={styles.cardContent}>
                    <Text style={[styles.description, { color: colors.textPrimary }]}>
                        {isDescriptionExpanded || item.description.length <= DESCRIPTION_LIMIT
                            ? item.description
                            : item.description.substring(0, DESCRIPTION_LIMIT)}
                        {!isDescriptionExpanded && item.description.length > DESCRIPTION_LIMIT && (
                            <Text
                                style={[styles.readMore, { color: colors.textSecondary }]}
                                onPress={() => setIsDescriptionExpanded(true)}
                            >
                                {'...Daha fazla'}
                            </Text>
                        )}
                        {isDescriptionExpanded && item.description.length > DESCRIPTION_LIMIT && (
                            <Text
                                style={[styles.readMore, { color: colors.textSecondary }]}
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

```
