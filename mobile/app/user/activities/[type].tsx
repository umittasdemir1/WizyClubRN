import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { MediaGrid } from '../../../src/presentation/components/shared/MediaGrid';
import { UserActivityRepositoryImpl } from '../../../src/data/repositories/UserActivityRepositoryImpl';
import { Video } from '../../../src/domain/entities/Video';
import { useThemeStore } from '../../../src/presentation/store/useThemeStore';
import { useAuthStore } from '../../../src/presentation/store/useAuthStore';
import { useActiveVideoStore } from '../../../src/presentation/store/useActiveVideoStore';
import { useVideoCounterStore } from '../../../src/presentation/store/useVideoCounterStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../src/core/constants';
import { isFeedVideoItem } from '../../../src/presentation/components/poolFeed/utils/PoolFeedUtils';
import { useResolvedVideoCounters } from '../../../src/presentation/hooks/useResolvedVideoCounters';
import { logError, LogCode } from '@/core/services/Logger';

const repository = new UserActivityRepositoryImpl();

const resolveCounter = (video: Video, activityType: string): number => {
    if (activityType === 'likes') return video.likesCount ?? 0;
    if (activityType === 'saved') return video.savesCount ?? 0;
    return video.viewsCount ?? 0;
};

const resolveMediaType = (video: Video): 'video' | 'carousel' | 'photo' => {
    if (isFeedVideoItem(video)) return 'video';
    return video.postType === 'carousel' ? 'carousel' : 'photo';
};

export default function ActivitiesScreen() {
    const { type } = useLocalSearchParams<{ type: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDark } = useThemeStore();
    const { user } = useAuthStore();
    const setActiveVideo = useActiveVideoStore((state) => state.setActiveVideo);
    const syncVideoCountersFromServer = useVideoCounterStore((state) => state.syncFromServer);

    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const resolvedVideos = useResolvedVideoCounters(videos);

    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const bgColor = themeColors.background;
    const textColor = themeColors.textPrimary;

    const getTitle = () => {
        switch (type) {
            case 'likes': return 'Beğenilerin';
            case 'saved': return 'Kaydedilenlerin';
            case 'archived': return 'Arşivlenenler';
            case 'history': return 'İzleme Geçmişi';
            default: return 'Hareketler';
        }
    };

    const fetchData = useCallback(async () => {
        if (!user?.id) return;

        try {
            let data: Video[] = [];
            if (type === 'likes') {
                data = await repository.getLikedVideos(user.id);
            } else if (type === 'saved') {
                data = await repository.getSavedVideos(user.id);
            } else if (type === 'history') {
                data = await repository.getWatchHistory(user.id);
            }
            syncVideoCountersFromServer(data);
            setVideos(data);
        } catch (error) {
            logError(LogCode.REPO_ERROR, 'Activities fetch error', { error, type, userId: user?.id });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [syncVideoCountersFromServer, type, user?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleVideoPress = (video: { id: string }, index: number) => {
        setActiveVideo(video.id, index);
        router.navigate('/videos' as any);
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: isDark ? '#2c2c2e' : '#e5e5e5' }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={textColor} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: textColor }]}>{getTitle()}</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textColor} />
                }
            >
                {!loading && resolvedVideos.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                            Henüz bir içerik bulunmuyor.
                        </Text>
                    </View>
                ) : (
                    <MediaGrid
                        items={resolvedVideos.map((video) => ({
                            id: video.id,
                            thumbnail: video.thumbnailUrl,
                            views: resolveCounter(video, type ?? ''),
                            type: resolveMediaType(video),
                        }))}
                        isDark={isDark}
                        aspectRatio={0.8}
                        onPress={handleVideoPress}
                        gap={1}
                        padding={0}
                        useMediaTypeSvgForViewCountIcon={true}
                    />
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingBottom: 15,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
    },
});
