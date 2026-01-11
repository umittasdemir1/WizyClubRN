import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Image } from 'expo-image';
import { RotateCcw, Trash2 } from 'lucide-react-native';
import { supabase } from '../../../core/supabase';
import { CONFIG } from '../../../core/config';

interface DeletedContentMenuProps {
    isDark: boolean;
    isActive: boolean;
}

export const DeletedContentMenu = ({ isDark, isActive }: DeletedContentMenuProps) => {
    const [deletedVideos, setDeletedVideos] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const metaColor = isDark ? '#9a9aa0' : '#6b6b72';
    const textColor = isDark ? '#f2f2f4' : '#121214';
    const separatorColor = isDark ? '#2c2c2e' : '#e6e6ea';
    const thumbnailBorder = isDark ? '#2a2a2e' : '#ececf1';
    const actionBg = isDark ? '#2c2c2e' : '#ededf0';
    const dangerBg = '#FF3B30';
    const dangerText = '#FFFFFF';

    const fetchDeletedVideos = async () => {
        setIsLoading(true);
        // Supabase NOT query: we want deleted_at NOT null
        const { data } = await supabase
            .from('videos')
            .select('*')
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false });

        if (data) {
            setDeletedVideos(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (isActive) {
            fetchDeletedVideos();
        }
    }, [isActive]);

    const handleRestore = async (id: string) => {
        try {
            // Call Backend Restore Endpoint
            const response = await fetch(`${CONFIG.API_URL}/videos/${id}/restore`, {
                method: 'POST',
            });
            const result = await response.json();
            if (result.success) {
                Alert.alert("Başarılı", "Video başarıyla geri yüklendi!");
                fetchDeletedVideos(); // Refresh list
            } else {
                Alert.alert("Hata", "Geri yükleme başarısız oldu.");
            }
        } catch (e) {
            Alert.alert("Hata", "Bir sorun oluştu.");
        }
    };

    const handlePermanentDelete = async (id: string) => {
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
                            // 🔥 Get auth token for authenticated delete
                            const { useAuthStore } = require('../../store/useAuthStore');
                            const token = useAuthStore.getState().session?.access_token;
                            console.log(`[HardDelete] 🔑 Token: ${token ? 'Present' : 'MISSING'}`);

                            // Call Backend DELETE with ?force=true + Auth header
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
                            console.error(e);
                        }
                    }
                }
            ]
        );
    };

    const getDaysLeft = (deletedAt: string) => {
        const deletedAtMs = new Date(deletedAt).getTime();
        const diffDays = Math.floor((Date.now() - deletedAtMs) / (1000 * 60 * 60 * 24));
        return Math.max(0, 15 - diffDays);
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.itemContainer, { borderBottomColor: separatorColor }]}>
            <Image
                source={{ uri: item.thumbnail_url }}
                style={[styles.thumbnail, { borderColor: thumbnailBorder }]}
                contentFit="cover"
            />
            <View style={styles.infoContainer}>
                <View style={styles.metaRow}>
                    <Text style={[styles.dateText, { color: '#FFFFFF' }]}>
                        Silinme: {new Date(item.deleted_at).toLocaleDateString()}
                    </Text>
                    <View style={[styles.daysLeftPill, { backgroundColor: actionBg }]}>
                        <Text style={[styles.daysLeftText, { color: '#FFFFFF' }]}>
                            {getDaysLeft(item.deleted_at) === 0 ? 'Süre doldu' : `${getDaysLeft(item.deleted_at)} gün kaldı`}
                        </Text>
                    </View>
                </View>
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: actionBg }]}
                        onPress={() => handleRestore(item.id)}
                    >
                        <RotateCcw size={18} color={textColor} strokeWidth={1.2} />
                        <Text style={[styles.actionText, { color: textColor }]}>Geri yükle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: dangerBg }]}
                        onPress={() => handlePermanentDelete(item.id)}
                    >
                        <Trash2 size={18} color={dangerText} strokeWidth={1.2} />
                        <Text style={[styles.actionText, { color: dangerText }]}>Kalıcı sil</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.subtitle, { color: metaColor }]}>
                    Silinen videolar 15 gün içinde geri yüklenebilir.
                </Text>
            </View>

            {isLoading ? (
                <View style={styles.emptyState}>
                    <Text style={{ color: metaColor }}>Yükleniyor...</Text>
                </View>
            ) : deletedVideos.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={{ color: metaColor }}>Silinen içerik yok.</Text>
                </View>
            ) : (
                <View style={styles.listContainer}>
                    {deletedVideos.map((item) => (
                        <View key={item.id}>{renderItem({ item })}</View>
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        borderBottomWidth: 1,
    },
    thumbnail: {
        width: 64,
        height: 88,
        borderRadius: 10,
        backgroundColor: '#333',
        borderWidth: 1,
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
