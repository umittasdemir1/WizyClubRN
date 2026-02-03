import React, { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { SystemBars } from 'react-native-edge-to-edge';
import { useActiveVideoStore, useMuteControls } from '../../store/useActiveVideoStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { DARK_COLORS, LIGHT_COLORS } from '../../../core/constants';
import { getVideoUrl } from '../../../core/utils/videoUrl';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import { InfiniteFeedHeader, FeedTab } from './InfiniteFeedHeader';
import { InfiniteFeedCard } from './InfiniteFeedCard';
import { styles } from './InfiniteFeedManager.styles';
import { FEED_FLAGS } from '../feed/hooks/useFeedConfig';

interface InfiniteFeedManagerProps {
    videos: VideoEntity[];
    isLoading: boolean;
    isRefreshing: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    error: string | null;
    refreshFeed: () => void;
    loadMore: () => void;
    toggleLike: (id: string) => void;
    toggleSave: (id: string) => void;
    toggleFollow: (id: string) => void;
    toggleShare: (id: string) => void;
    toggleShop: (id: string) => void;
}

export function InfiniteFeedManager({
    videos,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    error,
    refreshFeed,
    loadMore,
    toggleLike,
    toggleSave,
    toggleFollow,
    toggleShare,
    toggleShop,
}: InfiniteFeedManagerProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const isDark = useThemeStore((state) => state.isDark);
    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const { isMuted, toggleMute } = useMuteControls();
    const currentUserId = useAuthStore((state) => state.user?.id);

    const [activeTab, setActiveTab] = useState<FeedTab>('Senin İçin');
    const [activeInlineId, setActiveInlineId] = useState<string | null>(null);
    const [isCarouselInteracting, setIsCarouselInteracting] = useState(false);

    const setCustomFeed = useActiveVideoStore((state) => state.setCustomFeed);
    const setActiveVideo = useActiveVideoStore((state) => state.setActiveVideo);

    useFocusEffect(
        useCallback(() => {
            SystemBars.setStyle({
                statusBar: isDark ? 'light' : 'dark',
                navigationBar: isDark ? 'light' : 'dark',
            });
            SystemBars.setHidden({ statusBar: false, navigationBar: false });
        }, [isDark])
    );

    const handleOpenVideo = useCallback((id: string, index: number) => {
        setCustomFeed(videos);
        setActiveVideo(id, index);
        router.push('/custom-feed' as any);
    }, [videos, setCustomFeed, setActiveVideo, router]);

    const handleCarouselTouchStart = useCallback(() => {
        setIsCarouselInteracting(true);
    }, []);

    const handleCarouselTouchEnd = useCallback(() => {
        setIsCarouselInteracting(false);
    }, []);

    const renderItem = useCallback(({ item, index }: { item: VideoEntity; index: number }) => (
        <InfiniteFeedCard
            item={item}
            index={index}
            colors={themeColors}
            isActive={item.id === activeInlineId}
            isMuted={isMuted}
            currentUserId={currentUserId}
            onToggleMute={toggleMute}
            onOpen={handleOpenVideo}
            onLike={toggleLike}
            onSave={toggleSave}
            onFollow={toggleFollow}
            onShare={toggleShare}
            onShop={toggleShop}
            onCarouselTouchStart={handleCarouselTouchStart}
            onCarouselTouchEnd={handleCarouselTouchEnd}
        />
    ), [activeInlineId, currentUserId, handleCarouselTouchEnd, handleCarouselTouchStart, handleOpenVideo, isMuted, themeColors, toggleFollow, toggleLike, toggleSave, toggleShare, toggleShop]);

    // ✅ Video starts when 40% visible
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 60,
        minimumViewTime: 100,
    }).current;

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ item: VideoEntity }> }) => {
        const firstPlayable = viewableItems.find((viewable) => {
            const video = viewable.item;
            return video.postType !== 'carousel' && !!getVideoUrl(video);
        });
        setActiveInlineId(firstPlayable?.item.id ?? null);
    }).current;

    const listEmpty = (
        <View style={styles.emptyState}>
            {isLoading ? (
                <ActivityIndicator size="large" color={themeColors.textPrimary} />
            ) : (
                <>
                    <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>Akış boş görünüyor</Text>
                    <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                        {error || 'Yeni içerikler geldiğinde burada göreceksin.'}
                    </Text>
                    {error ? (
                        <Pressable
                            style={[styles.retryButton, { borderColor: themeColors.textPrimary }]}
                            onPress={refreshFeed}
                        >
                            <Text style={[styles.retryText, { color: themeColors.textPrimary }]}>Tekrar Dene</Text>
                        </Pressable>
                    ) : null}
                </>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <FlashList
                data={videos}
                renderItem={renderItem}
                keyExtractor={(item: VideoEntity) => item.id}
                extraData={activeInlineId}
                viewabilityConfig={viewabilityConfig}
                onViewableItemsChanged={onViewableItemsChanged}
                estimatedItemSize={500}
                removeClippedSubviews={true}
                showsVerticalScrollIndicator={false}
                scrollEnabled={!isCarouselInteracting}
                ListHeaderComponent={!FEED_FLAGS.INF_DISABLE_HEADER_TABS ? (
                    <InfiniteFeedHeader
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        colors={themeColors}
                        insetTop={insets.top}
                        onUploadPress={() => router.push('/upload')}
                    />
                ) : (
                    <View style={{ height: insets.top }} />
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={refreshFeed}
                        tintColor={themeColors.textPrimary}
                    />
                }
                onEndReached={hasMore ? loadMore : undefined}
                onEndReachedThreshold={0.6}
                ListFooterComponent={
                    isLoadingMore ? (
                        <ActivityIndicator style={styles.footerLoader} color={themeColors.textPrimary} />
                    ) : null
                }
                ListEmptyComponent={listEmpty}
                contentContainerStyle={{
                    paddingBottom: insets.bottom + 80,
                }}
            />
            <View
                pointerEvents="none"
                style={[
                    styles.statusBarOverlay,
                    { height: insets.top, backgroundColor: themeColors.background },
                ]}
            />
        </View>
    );
}
