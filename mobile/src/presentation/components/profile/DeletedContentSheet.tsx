import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { RotateCcw, Trash2 } from 'lucide-react-native';
import { FeedQueryService, type DeletedVideoRecord } from '../../../data/services/FeedQueryService';
import { CONFIG } from '../../../core/config';
import { logVideo, logError, LogCode } from '@/core/services/Logger';
import { useSurfaceTheme } from '../../hooks/useSurfaceTheme';
import { getAccessToken } from '../../store/getAccessToken';
import { useAuthStore } from '../../store/useAuthStore';

interface DeletedContentMenuProps {
    isDark: boolean;
    isActive: boolean;
}

type ContentTab = 'videos' | 'stories';

export const DeletedContentMenu = ({ isDark, isActive }: DeletedContentMenuProps) => {
    const [activeTab, setActiveTab] = useState<ContentTab>('videos');
    const [deletedVideos, setDeletedVideos] = useState<DeletedVideoRecord[]>([]);
    const [deletedStories, setDeletedStories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const modalTheme = useSurfaceTheme(isDark);
    const [feedQueryService] = useState(() => new FeedQueryService());
    const currentUserId = useAuthStore((state) => state.user?.id);

    const metaColor = isDark ? '#9a9aa0' : '#6b6b72';
    const textColor = isDark ? '#f2f2f4' : '#121214';
    const separatorColor = isDark ? '#2c2c2e' : '#e6e6ea';
    const thumbnailBorder = isDark ? '#2a2a2e' : '#ececf1';
    const actionBg = isDark ? '#2c2c2e' : '#ededf0';
    const dangerBg = '#FF3B30';
    const dangerText = '#FFFFFF';
    const tabActiveBg = isDark ? '#3a3a3e' : '#e0e0e4';
    const tabInactiveBg = isDark ? '#1c1c1e' : '#f2f2f5';

    const fetchDeletedVideos = async () => {
        if (!currentUserId) {
            setDeletedVideos([]);
            return;
        }

        const data = await feedQueryService.getDeletedVideos(currentUserId, 50);
        setDeletedVideos(data);
    };

    const fetchDeletedStories = async () => {
        try {
            const token = await getAccessToken();
            if (!token) return;

            const response = await fetch(`${CONFIG.API_URL}/stories/recently-deleted`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const result = await response.json();
            if (result.success && result.data) {
                setDeletedStories(result.data);
            }
        } catch (e) {
            logError(LogCode.DB_QUERY_ERROR, 'Failed to fetch deleted stories', { error: e });
        }
    };

    const fetchAll = async () => {
        setIsLoading(true);
        await Promise.all([fetchDeletedVideos(), fetchDeletedStories()]);
        setIsLoading(false);
    };

    useEffect(() => {
        if (isActive) {
            fetchAll();
        }
    }, [currentUserId, feedQueryService, isActive]);

    // ---- Video Actions ----
    const handleRestoreVideo = async (id: string) => {
        try {
            const token = await getAccessToken();
            if (!token) {
                Alert.alert("Hata", "Oturum bulunamadı.");
                return;
            }

            const response = await fetch(`${CONFIG.API_URL}/videos/${id}/restore`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const result = await response.json();
            if (result.success) {
                Alert.alert("Başarılı", "Video başarıyla geri yüklendi!");
                fetchDeletedVideos();
            } else {
                Alert.alert("Hata", "Geri yükleme başarısız oldu.");
            }
        } catch (e) {
            Alert.alert("Hata", "Bir sorun oluştu.");
        }
    };

    const handlePermanentDeleteVideo = async (id: string) => {
        Alert.alert(
            "Kalıcı Olarak Sil?",
            "Bu işlem geri alınamaz.",
            [
                { text: "Vazgeç", style: 'cancel' },
                {
                    text: "Sil",
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await getAccessToken();
                            logVideo(LogCode.VIDEO_DELETE_PERMANENT, 'Permanent delete initiated', {
                                videoId: id,
                                hasToken: !!token
                            });

                            const response = await fetch(`${CONFIG.API_URL}/videos/${id}?force=true`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                },
                            });
                            const result = await response.json();
                            if (result.success) {
                                fetchDeletedVideos();
                            }
                        } catch (e) {
                            logError(LogCode.VIDEO_DELETE_ERROR, 'Permanent delete failed', { error: e, videoId: id });
                        }
                    }
                }
            ]
        );
    };

    // ---- Story Actions ----
    const handleRestoreStory = async (id: string) => {
        try {
            const token = await getAccessToken();
            if (!token) {
                Alert.alert("Hata", "Oturum bulunamadı.");
                return;
            }

            const response = await fetch(`${CONFIG.API_URL}/stories/${id}/restore`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            const result = await response.json();
            if (result.success) {
                Alert.alert("Başarılı", "Hikaye başarıyla geri yüklendi!");
                fetchDeletedStories();
            } else {
                Alert.alert("Hata", result.error || "Geri yükleme başarısız oldu.");
            }
        } catch (e) {
            Alert.alert("Hata", "Bir sorun oluştu.");
        }
    };

    const handlePermanentDeleteStory = async (id: string) => {
        Alert.alert(
            "Kalıcı Olarak Sil?",
            "Bu işlem geri alınamaz. Hikaye hem veritabanından hem depolamadan kalıcı olarak silinir.",
            [
                { text: "Vazgeç", style: 'cancel' },
                {
                    text: "Sil",
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await getAccessToken();
                            if (!token) return;

                            const response = await fetch(`${CONFIG.API_URL}/stories/${id}?force=true`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                },
                            });
                            const result = await response.json();
                            if (result.success) {
                                fetchDeletedStories();
                            }
                        } catch (e) {
                            logError(LogCode.DB_DELETE, 'Story permanent delete failed', { error: e, storyId: id });
                        }
                    }
                }
            ]
        );
    };

    // ---- Time helpers ----
    const getVideoDaysLeft = (deletedAt: string | null) => {
        if (!deletedAt) return 0;
        const deletedAtMs = new Date(deletedAt).getTime();
        const diffDays = Math.floor((Date.now() - deletedAtMs) / (1000 * 60 * 60 * 24));
        return Math.max(0, 15 - diffDays);
    };

    const getStoryHoursLeft = (deletedAt: string) => {
        const deletedAtMs = new Date(deletedAt).getTime();
        const diffHours = (Date.now() - deletedAtMs) / (1000 * 60 * 60);
        return Math.max(0, Math.ceil(24 - diffHours));
    };

    // ---- Render items ----
    const renderVideoItem = (item: any) => (
        <View key={item.id} style={[styles.itemContainer, { borderBottomColor: separatorColor, borderBottomWidth: modalTheme.separatorWidth }]}>
                <Image
                    source={{ uri: item.thumbnailUrl }}
                    style={[styles.thumbnail, { borderColor: thumbnailBorder, borderWidth: modalTheme.separatorWidth }]}
                    contentFit="cover"
                />
            <View style={styles.infoContainer}>
                <View style={styles.metaRow}>
                    <Text style={[styles.dateText, { color: '#FFFFFF' }]}>
                        Silinme: {new Date(item.deletedAt).toLocaleDateString()}
                    </Text>
                    <View style={[styles.daysLeftPill, { backgroundColor: actionBg }]}>
                        <Text style={[styles.daysLeftText, { color: '#FFFFFF' }]}>
                            {getVideoDaysLeft(item.deletedAt) === 0 ? 'Süre doldu' : `${getVideoDaysLeft(item.deletedAt)} gün kaldı`}
                        </Text>
                    </View>
                </View>
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: actionBg }]}
                        onPress={() => handleRestoreVideo(item.id)}
                    >
                        <RotateCcw size={18} color={textColor} strokeWidth={1.2} />
                        <Text style={[styles.actionText, { color: textColor }]}>Geri yükle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: dangerBg }]}
                        onPress={() => handlePermanentDeleteVideo(item.id)}
                    >
                        <Trash2 size={18} color={dangerText} strokeWidth={1.2} />
                        <Text style={[styles.actionText, { color: dangerText }]}>Kalıcı sil</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderStoryItem = (item: any) => {
        const hoursLeft = getStoryHoursLeft(item.deleted_at);
        return (
            <View key={item.id} style={[styles.itemContainer, { borderBottomColor: separatorColor, borderBottomWidth: modalTheme.separatorWidth }]}>
                <Image
                    source={{ uri: item.thumbnail_url }}
                    style={[styles.thumbnail, { borderColor: thumbnailBorder, borderWidth: modalTheme.separatorWidth }]}
                    contentFit="cover"
                />
                <View style={styles.infoContainer}>
                    <View style={styles.metaRow}>
                        <Text style={[styles.dateText, { color: '#FFFFFF' }]}>
                            Silinme: {new Date(item.deleted_at).toLocaleDateString()}
                        </Text>
                        <View style={[styles.daysLeftPill, { backgroundColor: hoursLeft <= 2 ? dangerBg : actionBg }]}>
                            <Text style={[styles.daysLeftText, { color: '#FFFFFF' }]}>
                                {hoursLeft === 0 ? 'Süre doldu' : `${hoursLeft} saat kaldı`}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: actionBg }]}
                            onPress={() => handleRestoreStory(item.id)}
                        >
                            <RotateCcw size={18} color={textColor} strokeWidth={1.2} />
                            <Text style={[styles.actionText, { color: textColor }]}>Geri yükle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: dangerBg }]}
                            onPress={() => handlePermanentDeleteStory(item.id)}
                        >
                            <Trash2 size={18} color={dangerText} strokeWidth={1.2} />
                            <Text style={[styles.actionText, { color: dangerText }]}>Kalıcı sil</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const currentItems = activeTab === 'videos' ? deletedVideos : deletedStories;

    return (
        <View style={styles.container}>
            {/* Tab switcher */}
            <View style={[styles.tabContainer, { backgroundColor: tabInactiveBg }]}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'videos' && { backgroundColor: tabActiveBg },
                    ]}
                    onPress={() => setActiveTab('videos')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'videos' ? textColor : metaColor },
                    ]}>
                        Videolar {deletedVideos.length > 0 ? `(${deletedVideos.length})` : ''}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'stories' && { backgroundColor: tabActiveBg },
                    ]}
                    onPress={() => setActiveTab('stories')}
                >
                    <Text style={[
                        styles.tabText,
                        { color: activeTab === 'stories' ? textColor : metaColor },
                    ]}>
                        Hikayeler {deletedStories.length > 0 ? `(${deletedStories.length})` : ''}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.header}>
                <Text style={[styles.subtitle, { color: metaColor }]}>
                    {activeTab === 'videos'
                        ? 'Silinen videolar 15 gün içinde geri yüklenebilir.'
                        : 'Silinen hikayeler 24 saat içinde geri yüklenebilir.'}
                </Text>
            </View>

            {isLoading ? (
                <View style={styles.emptyState}>
                    <Text style={{ color: metaColor }}>Yükleniyor...</Text>
                </View>
            ) : currentItems.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={{ color: metaColor }}>
                        {activeTab === 'videos' ? 'Silinen video yok.' : 'Silinen hikaye yok.'}
                    </Text>
                </View>
            ) : (
                <View style={styles.listContainer}>
                    {activeTab === 'videos'
                        ? deletedVideos.map((item) => renderVideoItem(item))
                        : deletedStories.map((item) => renderStoryItem(item))
                    }
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 10,
        padding: 3,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    header: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 12,
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 18,
        textAlign: 'center',
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    itemContainer: {
        flexDirection: 'row',
        paddingVertical: 14,
        alignItems: 'center',
    },
    thumbnail: {
        width: 64,
        height: 88,
        borderRadius: 10,
        backgroundColor: '#333',
    },
    infoContainer: {
        flex: 1,
        marginLeft: 12,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 8,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '400',
    },
    daysLeftPill: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 999,
    },
    daysLeftText: {
        fontSize: 11,
        fontWeight: '400',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 6,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 12,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
});
