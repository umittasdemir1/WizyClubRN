import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { supabase } from '../../../core/supabase';
import { CONFIG } from '../../../core/config';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DeletedContentSheetProps {
    isDark: boolean;
}

export const DeletedContentSheet = React.forwardRef<BottomSheet, DeletedContentSheetProps>(({ isDark }, ref) => {
    const insets = useSafeAreaInsets();

    const topOffset = insets.top + 60 + 25;
    const snapPoints = useMemo(() => [SCREEN_HEIGHT - topOffset], [insets.top]);

    const [deletedVideos, setDeletedVideos] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const bgColor = isDark ? '#1c1c1e' : themeColors.background;

    const fetchDeletedVideos = async () => {
        setIsLoading(true);
        // Supabase NOT query: we want deleted_at NOT null
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false });

        if (data) {
            setDeletedVideos(data);
        }
        setIsLoading(false);
    };

    // Auto-fetch when sheet opens usually, but for now we'll fetch on mount/visible
    // Ideally parent triggers this.
    useEffect(() => {
        fetchDeletedVideos();
    }, []);

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
                            // Call Backend DELETE with ?force=true
                            const response = await fetch(`${CONFIG.API_URL}/videos/${id}?force=true`, {
                                method: 'DELETE',
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

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.itemContainer, { backgroundColor: isDark ? '#1c1c1e' : '#f0f0f0' }]}>
            <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} contentFit="cover" />
            <View style={styles.infoContainer}>
                <Text style={[styles.dateText, { color: isDark ? '#888' : '#666' }]}>
                    Silinme: {new Date(item.deleted_at).toLocaleDateString()}
                </Text>
                <View style={styles.buttonsRow}>
                    <TouchableOpacity
                        style={[styles.restoreBtn, { backgroundColor: isDark ? '#fff' : '#000' }]}
                        onPress={() => handleRestore(item.id)}
                    >
                        <Text style={[styles.btnText, { color: isDark ? '#000' : '#fff' }]}>Geri Yükle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handlePermanentDelete(item.id)}
                    >
                        <Text style={styles.btnTextWhite}>Sil</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <BottomSheet
            ref={ref}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose={true}
            backgroundStyle={{ backgroundColor: bgColor, borderTopLeftRadius: 40, borderTopRightRadius: 40 }}
            handleIndicatorStyle={{ backgroundColor: isDark ? '#fff' : '#000' }}
            backdropComponent={(props) => (
                <BottomSheetBackdrop {...props} opacity={0.5} disappearsOnIndex={-1} />
            )}
            onChange={(index) => {
                if (index >= 0) fetchDeletedVideos();
            }}
        >
            <BottomSheetView style={styles.container}>
                <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
                    Yakınlarda Silinenler
                </Text>
                <Text style={[styles.subtitle, { color: isDark ? '#888' : '#666' }]}>
                    Videolar 15 gün sonra kalıcı olarak silinir.
                </Text>

                {deletedVideos.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={{ color: isDark ? '#555' : '#aaa' }}>Silinen içerik yok.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={deletedVideos}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: 16 }}
                    />
                )}
            </BottomSheetView>
        </BottomSheet>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 10,
    },
    subtitle: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 20,
    },
    itemContainer: {
        flexDirection: 'row',
        padding: 10,
        marginBottom: 10,
        borderRadius: 12,
        alignItems: 'center',
    },
    thumbnail: {
        width: 60,
        height: 80,
        borderRadius: 8,
        backgroundColor: '#333',
    },
    infoContainer: {
        flex: 1,
        marginLeft: 12,
    },
    dateText: {
        fontSize: 12,
        marginBottom: 8,
    },
    buttonsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    restoreBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    deleteBtn: {
        backgroundColor: '#ff3b30',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    btnText: {
        fontSize: 12,
        fontWeight: '600',
    },
    btnTextWhite: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
});
