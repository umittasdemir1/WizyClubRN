import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Dimensions,
    Image,
    Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { useAuthStore } from '../src/presentation/store/useAuthStore';
import { useVideoEditStore } from '../src/presentation/store/useVideoEditStore';
import { LIGHT_COLORS, DARK_COLORS } from '../src/core/constants';
import { supabase } from '../src/core/supabase';
import { logError, LogCode } from '../src/core/services/Logger';
import { CONFIG } from '../src/core/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH * 0.40;

type EditVideoPayload = {
    id: string;
    user_id: string;
    thumbnail_url: string | null;
    description: string | null;
};

const normalizeParam = (value: string | string[] | undefined) => (
    Array.isArray(value) ? value[0] : value
);

export default function EditPostScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { videoId } = useLocalSearchParams<{ videoId?: string | string[] }>();
    const resolvedVideoId = useMemo(() => normalizeParam(videoId)?.trim() ?? '', [videoId]);

    const { isDark } = useThemeStore();
    const { user } = useAuthStore();
    const upsertDescription = useVideoEditStore((state) => state.upsertDescription);
    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [initialDescription, setInitialDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const bgColor = isDark ? '#080A0F' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#080A0F';
    const subtextColor = isDark ? '#A0A0A0' : '#6B6B6B';
    const inputBg = isDark ? '#1C1C1E' : '#F5F5F5';
    const hasUnsavedChanges = description !== initialDescription;
    const canSave = hasUnsavedChanges && !isSaving && !isLoading && !error;
    const saveTextColor = hasUnsavedChanges ? '#FFFFFF' : '#8E8E93';

    const fetchEditableVideo = useCallback(async () => {
        if (!resolvedVideoId) {
            setError('Geçersiz gönderi.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('videos')
            .select('id,user_id,thumbnail_url,description')
            .eq('id', resolvedVideoId)
            .is('deleted_at', null)
            .single<EditVideoPayload>();

        if (fetchError || !data) {
            logError(LogCode.DB_QUERY_ERROR, 'Edit video fetch failed', {
                videoId: resolvedVideoId,
                error: fetchError,
            });
            setError('Gönderi yüklenemedi.');
            setIsLoading(false);
            return;
        }

        if (user?.id && data.user_id !== user.id) {
            setError('Bu gönderiyi düzenleme yetkin bulunmuyor.');
            setIsLoading(false);
            return;
        }

        const fetchedDescription = data.description || '';
        setThumbnailUrl(data.thumbnail_url || null);
        setDescription(fetchedDescription);
        setInitialDescription(fetchedDescription);
        setIsLoading(false);
    }, [resolvedVideoId, user?.id]);

    useEffect(() => {
        void fetchEditableVideo();
    }, [fetchEditableVideo]);

    const handleSave = useCallback(async () => {
        if (!hasUnsavedChanges || isSaving) return;
        if (!user?.id || !resolvedVideoId) {
            Alert.alert('Hata', 'Gönderi güncellenemedi.');
            return;
        }

        setIsSaving(true);

        const { data: updatedVideo, error: updateError } = await supabase
            .from('videos')
            .update({
                description,
            })
            .eq('id', resolvedVideoId)
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .select('id')
            .single();

        if (updateError || !updatedVideo) {
            logError(LogCode.DB_UPDATE, 'Edit video update failed', {
                videoId: resolvedVideoId,
                userId: user.id,
                error: updateError,
            });
            Alert.alert('Hata', 'Gönderi güncellenirken bir hata oluştu.');
            setIsSaving(false);
            return;
        }

        setInitialDescription(description);
        upsertDescription(resolvedVideoId, description);
        setIsSaving(false);
        router.back();
    }, [description, hasUnsavedChanges, isSaving, resolvedVideoId, router, upsertDescription, user?.id]);

    const handleOpenSubtitleEditor = useCallback(() => {
        if (!resolvedVideoId) return;
        router.push(`/subtitle-edit?videoId=${encodeURIComponent(resolvedVideoId)}` as any);
    }, [resolvedVideoId, router]);

    const handleGenerateSubtitles = useCallback(async () => {
        if (!resolvedVideoId) return;
        try {
            const response = await fetch(`${CONFIG.API_URL}/videos/${resolvedVideoId}/subtitles/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: 'auto' }),
            });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || 'Altyazı üretimi başlatılamadı.');
            }
            Alert.alert('Başlatıldı', 'Altyazı üretimi başlatıldı.');
        } catch (error: any) {
            Alert.alert('Hata', error?.message || 'Altyazı üretimi başlatılamadı.');
        }
    }, [resolvedVideoId]);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: bgColor }]}
        >
            <View style={[styles.header, { paddingTop: insets.top, backgroundColor: bgColor }]}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={() => router.back()} style={styles.closeButton}>
                        <X color={textColor} size={34} strokeWidth={1.5} />
                    </Pressable>
                </View>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>Gönderiyi Düzenle</Text>
                </View>
                <View style={styles.headerRight}>
                    <Pressable
                        style={styles.saveButton}
                        onPress={handleSave}
                        disabled={!canSave}
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Check color={saveTextColor} size={34} strokeWidth={1.5} />
                        )}
                    </Pressable>
                </View>
            </View>

            {isLoading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator size="small" color={themeColors.textPrimary} />
                </View>
            ) : error ? (
                <View style={styles.centerState}>
                    <Text style={[styles.stateText, { color: subtextColor }]}>{error}</Text>
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.previewSection}>
                        <View style={styles.previewContainer}>
                            {thumbnailUrl ? (
                                <Image
                                    source={{ uri: thumbnailUrl }}
                                    style={styles.previewImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <View style={[styles.previewFallback, { backgroundColor: inputBg }]}>
                                    <Text style={[styles.previewFallbackText, { color: subtextColor }]}>Thumbnail bulunamadı</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.descriptionSection}>
                        <TextInput
                            style={[styles.descriptionInput, { color: textColor }]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Bir açıklama yaz..."
                            placeholderTextColor={subtextColor}
                            multiline
                            maxLength={2200}
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={styles.subtitleActions}>
                        <Pressable style={styles.subtitleButton} onPress={handleGenerateSubtitles}>
                            <Text style={styles.subtitleButtonText}>Altyazı Oluştur</Text>
                        </Pressable>
                        <Pressable style={styles.subtitleButton} onPress={handleOpenSubtitleEditor}>
                            <Text style={styles.subtitleButtonText}>Altyazı Düzenle</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            )}
        </KeyboardAvoidingView>
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
        paddingHorizontal: 12,
        height: 60,
    },
    headerLeft: {
        width: 72,
        alignItems: 'flex-start',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    headerRight: {
        width: 72,
        alignItems: 'flex-end',
    },
    closeButton: {
        width: 48,
        height: 48,
        marginLeft: -6,
        marginTop: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    headerTitle: {
        fontSize: 20,
        lineHeight: 24,
        fontWeight: '600',
        textAlign: 'center',
    },
    centerState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    stateText: {
        fontSize: 14,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    previewSection: {
        alignItems: 'center',
        marginTop: 10,
        paddingVertical: 20,
    },
    previewContainer: {
        width: PREVIEW_WIDTH,
        aspectRatio: 9 / 16,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#2C2C2E',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    previewFallback: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    previewFallbackText: {
        fontSize: 13,
        textAlign: 'center',
    },
    descriptionSection: {
        marginHorizontal: 16,
        marginTop: 8,
    },
    subtitleActions: {
        marginHorizontal: 16,
        marginTop: 20,
        gap: 10,
    },
    subtitleButton: {
        borderRadius: 10,
        backgroundColor: '#3A8DFF',
        paddingVertical: 12,
        alignItems: 'center',
    },
    subtitleButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    descriptionInput: {
        fontSize: 15,
        minHeight: 110,
        paddingHorizontal: 0,
        paddingVertical: 0,
    },
});
