import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, RefreshCw, Save } from 'lucide-react-native';
import { CONFIG } from '../src/core/config';
import { supabase } from '../src/core/supabase';
import { useThemeStore } from '../src/presentation/store/useThemeStore';

type SubtitleRow = {
    id: string;
    language: string;
    status: string;
    segments: Array<{ startMs: number; endMs: number; text: string }> | string | null;
};

const LANG_OPTIONS = ['auto', 'tr-TR', 'en-US'] as const;
type LangOption = typeof LANG_OPTIONS[number];

function normalizeVideoId(value: string | string[] | undefined) {
    const next = Array.isArray(value) ? value[0] : value;
    return String(next || '').trim();
}

function parseSegments(input: SubtitleRow['segments']) {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') {
        try {
            const parsed = JSON.parse(input);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function formatMs(ms: number) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function SubtitleEditScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { isDark } = useThemeStore();
    const { videoId } = useLocalSearchParams<{ videoId?: string | string[] }>();
    const resolvedVideoId = normalizeVideoId(videoId);

    const [language, setLanguage] = useState<LangOption>('auto');
    const [subtitleId, setSubtitleId] = useState<string | null>(null);
    const [segments, setSegments] = useState<Array<{ startMs: number; endMs: number; text: string }>>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const palette = useMemo(() => ({
        bg: isDark ? '#080A0F' : '#FFFFFF',
        text: isDark ? '#FFFFFF' : '#0B1020',
        muted: isDark ? '#A0A7B4' : '#6B7280',
        card: isDark ? '#121826' : '#F3F4F6',
        border: isDark ? '#2A3446' : '#E5E7EB',
    }), [isDark]);

    const loadSubtitles = useCallback(async () => {
        if (!resolvedVideoId) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${CONFIG.API_URL}/videos/${resolvedVideoId}/subtitles?language=${encodeURIComponent(language)}`);
            const payload = await response.json();
            const rows: SubtitleRow[] = Array.isArray(payload?.data) ? payload.data : [];
            const picked = rows.find((row) => row.status === 'completed') || rows[0];
            if (!picked) {
                setSubtitleId(null);
                setSegments([]);
                return;
            }
            setSubtitleId(picked.id);
            setSegments(parseSegments(picked.segments).map((segment: any) => ({
                startMs: Number(segment?.startMs) || 0,
                endMs: Number(segment?.endMs) || 0,
                text: String(segment?.text || ''),
            })));
        } catch {
            Alert.alert('Hata', 'Altyazı yüklenemedi.');
        } finally {
            setIsLoading(false);
        }
    }, [language, resolvedVideoId]);

    useEffect(() => {
        void loadSubtitles();
    }, [loadSubtitles]);

    const triggerGeneration = async () => {
        if (!resolvedVideoId) return;
        setIsGenerating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) {
                throw new Error('Lütfen tekrar giriş yapın.');
            }

            const response = await fetch(`${CONFIG.API_URL}/videos/${resolvedVideoId}/subtitles/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ language }),
            });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || 'Generate failed');
            }
            Alert.alert('Başlatıldı', 'Altyazı üretimi başlatıldı. Biraz sonra yenileyin.');
        } catch (error: unknown) {
            const err = error as Error;
            Alert.alert('Hata', err?.message || 'Altyazı üretimi başlatılamadı.');
        } finally {
            setIsGenerating(false);
        }
    };

    const saveSubtitleEdits = async () => {
        if (!resolvedVideoId || segments.length === 0) return;
        setIsSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) {
                throw new Error('Lütfen tekrar giriş yapın.');
            }

            const response = await fetch(`${CONFIG.API_URL}/videos/${resolvedVideoId}/subtitles`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    subtitleId,
                    language,
                    segments,
                }),
            });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || 'Save failed');
            }
            Alert.alert('Kaydedildi', 'Altyazı düzenlemeleri kaydedildi.');
        } catch (error: unknown) {
            const err = error as Error;
            Alert.alert('Hata', err?.message || 'Kaydetme başarısız.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
            <View style={[styles.header, { borderBottomColor: palette.border }]}>
                <Pressable onPress={() => router.back()} style={styles.headerBtn}>
                    <ChevronLeft color={palette.text} size={24} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: palette.text }]}>Altyazı Düzenle</Text>
                <Pressable onPress={saveSubtitleEdits} style={styles.headerBtn} disabled={isSaving || segments.length === 0}>
                    <Save color={isSaving ? palette.muted : palette.text} size={22} />
                </Pressable>
            </View>

            <View style={styles.toolbar}>
                <View style={styles.langRow}>
                    {LANG_OPTIONS.map((option) => (
                        <Pressable
                            key={option}
                            onPress={() => setLanguage(option)}
                            style={[styles.langChip, { backgroundColor: language === option ? '#3A8DFF' : palette.card, borderColor: palette.border }]}
                        >
                            <Text style={[styles.langText, { color: language === option ? '#FFFFFF' : palette.text }]}>{option}</Text>
                        </Pressable>
                    ))}
                </View>
                <View style={styles.actionRow}>
                    <Pressable style={[styles.actionBtn, { backgroundColor: palette.card, borderColor: palette.border }]} onPress={() => void loadSubtitles()} disabled={isLoading}>
                        <RefreshCw color={palette.text} size={18} />
                        <Text style={[styles.actionText, { color: palette.text }]}>{isLoading ? 'Yükleniyor' : 'Yenile'}</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, { backgroundColor: '#3A8DFF' }]} onPress={triggerGeneration} disabled={isGenerating}>
                        <Text style={[styles.actionText, { color: '#FFFFFF' }]}>{isGenerating ? 'Başlatılıyor' : 'Altyazı Oluştur'}</Text>
                    </Pressable>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {segments.map((segment, index) => (
                    <View key={`${segment.startMs}-${segment.endMs}-${index}`} style={[styles.segmentCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                        <Text style={[styles.segmentTime, { color: palette.muted }]}>
                            {formatMs(segment.startMs)} - {formatMs(segment.endMs)}
                        </Text>
                        <TextInput
                            value={segment.text}
                            onChangeText={(nextText) => {
                                setSegments((prev) => prev.map((item, itemIndex) => (
                                    itemIndex === index ? { ...item, text: nextText } : item
                                )));
                            }}
                            multiline
                            style={[styles.segmentInput, { color: palette.text }]}
                        />
                    </View>
                ))}
                {segments.length === 0 && (
                    <Text style={[styles.emptyText, { color: palette.muted }]}>Bu dil için düzenlenebilir altyazı bulunamadı.</Text>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        height: 56,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
    },
    headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '700' },
    toolbar: { paddingHorizontal: 14, paddingTop: 10, gap: 10 },
    langRow: { flexDirection: 'row', gap: 8 },
    langChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    langText: { fontSize: 12, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 8 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
    actionText: { fontSize: 12, fontWeight: '600' },
    content: { padding: 14, gap: 10, paddingBottom: 24 },
    segmentCard: { borderWidth: 1, borderRadius: 10, padding: 10 },
    segmentTime: { fontSize: 12, marginBottom: 6 },
    segmentInput: { minHeight: 54, fontSize: 14, lineHeight: 20, padding: 0 },
    emptyText: { textAlign: 'center', marginTop: 30, fontSize: 14 },
});
