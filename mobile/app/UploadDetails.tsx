import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, PlusCircle, Tag, Users, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { SystemBars } from 'react-native-edge-to-edge';
import { RichEditor, actions } from 'react-native-pell-rich-editor';
import AiIcon from '../assets/icons/ai.svg';
import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { useSurfaceTheme } from '../src/presentation/hooks/useSurfaceTheme';
import { useUploadComposerStore } from '../src/presentation/store/useUploadComposerStore';
import { useAuthStore } from '../src/presentation/store/useAuthStore';
import { useDraftStore } from '../src/presentation/store/useDraftStore';
import { useUploadStore } from '../src/presentation/store/useUploadStore';
import { useStoryStore } from '../src/presentation/store/useStoryStore';
import { CONFIG } from '../src/core/config';
import { supabase } from '../src/core/supabase';
import { LogCode, logData, logError } from '@/core/services/Logger';
import { stripRichTextTags } from '../src/core/utils/richText';

const COMMERCIAL_TYPES = [
    'İş Birliği İçermiyor',
    'Reklam',
    'İş Birliği',
    'Hediye Ürün',
    'Barter',
    'Satış Ortaklığı',
    'Marka Elçisi',
    'Marka Daveti',
    'Ürün İncelemesi',
    'Kendi Markam',
];

const DESCRIPTION_MAX_LENGTH = 2200;
const EDITOR_FONT_SIZE = 15;
const EDITOR_LINE_HEIGHT = 21;
const HTML_NAMED_ENTITIES: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
};
const DESCRIPTION_TAG_ACTION = {
    b: actions.setBold,
    i: actions.setItalic,
    u: actions.setUnderline,
} as const;

const decodeHtmlEntities = (input: string): string =>
    input
        .replace(/&#x([0-9a-f]+);/gi, (_, value: string) => {
            const parsed = Number.parseInt(value, 16);
            return Number.isNaN(parsed) ? '' : String.fromCodePoint(parsed);
        })
        .replace(/&#(\d+);/g, (_, value: string) => {
            const parsed = Number.parseInt(value, 10);
            return Number.isNaN(parsed) ? '' : String.fromCodePoint(parsed);
        })
        .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/g, (entity) => HTML_NAMED_ENTITIES[entity] ?? entity);

const normalizeRichEditorHtml = (inputHtml: string): string => {
    if (!inputHtml) return '';

    let nextValue = inputHtml;
    nextValue = nextValue.replace(/\r/g, '');
    nextValue = nextValue.replace(/<(\/?)strong\b[^>]*>/gi, '<$1b>');
    nextValue = nextValue.replace(/<(\/?)em\b[^>]*>/gi, '<$1i>');
    nextValue = nextValue.replace(/<(\/?)ins\b[^>]*>/gi, '<$1u>');
    nextValue = nextValue.replace(/<(\/?)b\b[^>]*>/gi, '<$1b>');
    nextValue = nextValue.replace(/<(\/?)i\b[^>]*>/gi, '<$1i>');
    nextValue = nextValue.replace(/<(\/?)u\b[^>]*>/gi, '<$1u>');
    nextValue = nextValue.replace(/<br\s*\/?>/gi, '\n');
    nextValue = nextValue.replace(/<\/(div|p|li|blockquote|h[1-6])>/gi, '\n');
    nextValue = nextValue.replace(/<(div|p|li|blockquote|h[1-6])\b[^>]*>/gi, '');
    nextValue = nextValue.replace(/<\/?span\b[^>]*>/gi, '');
    nextValue = nextValue.replace(/<(?!\/?(b|i|u)\b)[^>]+>/gi, '');
    nextValue = decodeHtmlEntities(nextValue).replace(/\u200B/g, '');
    nextValue = nextValue.replace(/\n{3,}/g, '\n\n');
    nextValue = nextValue.replace(/^\n+|\n+$/g, '');

    return nextValue;
};

export default function UploadDetailsScreen() {
    const insets = useSafeAreaInsets();
    const isDark = useThemeStore((state) => state.isDark);
    const modalTheme = useSurfaceTheme(isDark);
    const { user } = useAuthStore();
    const { createDraft } = useDraftStore();
    const triggerStoryRefresh = useStoryStore((state) => state.triggerRefresh);
    const { startUpload, setProgress, setStatus, setSuccess, setError, setThumbnailUri, reset: resetUploadState } = useUploadStore();
    const draft = useUploadComposerStore((state) => state.draft);
    const subtitleCache = useUploadComposerStore((state) => state.subtitleCache);
    const subtitlePresentationCache = useUploadComposerStore((state) => state.subtitlePresentationCache);
    const subtitleStyleCache = useUploadComposerStore((state) => state.subtitleStyleCache);
    const clearDraft = useUploadComposerStore((state) => state.clearDraft);
    const descriptionEditorRef = useRef<RichEditor | null>(null);
    const descriptionHtmlRef = useRef('');
    const descriptionToolbarRegisteredRef = useRef(false);
    const descriptionFocusedRef = useRef(false);

    const [description, setDescription] = useState('');
    const [formatButtonState, setFormatButtonState] = useState({
        bold: false,
        italic: false,
        underline: false,
    });
    const [tags, setTags] = useState<string[]>([]);
    const [commercialType, setCommercialType] = useState<string | null>(null);
    const [brandName, setBrandName] = useState('');
    const [brandUrl, setBrandUrl] = useState('');
    const [useAILabel, setUseAILabel] = useState(false);
    const [showCommercialMenu, setShowCommercialMenu] = useState(false);
    const [showTagInputModal, setShowTagInputModal] = useState(false);
    const [currentTagInput, setCurrentTagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const bgColor = modalTheme.fullScreenBackground;
    const textColor = modalTheme.textPrimary;
    const subtextColor = modalTheme.textSecondary;
    const borderColor = modalTheme.sheetBorder;
    const inputBg = modalTheme.inputBackground;
    const selectedFormatButtonBg = isDark ? '#3A3A3A' : '#E6E6E6';
    const selectedFormatButtonBorder = isDark ? '#5A5A5A' : '#C9C9C9';

    const title = useMemo(() => {
        if (!draft) return 'Gönderi Oluştur';
        if (draft.uploadMode === 'story') return 'Hikaye Oluştur';
        return 'Gönderi Oluştur';
    }, [draft]);

    const handleAddTag = () => setShowTagInputModal(true);
    const handleRemoveTag = (index: number) => setTags((prev) => prev.filter((_, i) => i !== index));
    const handleSaveTag = () => {
        const value = currentTagInput.trim();
        if (!value || tags.length >= 5) return;
        setTags((prev) => [...prev, value]);
        setCurrentTagInput('');
        setShowTagInputModal(false);
    };

    const handleClubsSelect = () => {
        Alert.alert('Bilgi', 'CLUB seçimi sonraki adımda bağlanacak.');
    };

    const handleDescriptionChange = useCallback((nextHtml: string) => {
        const normalized = normalizeRichEditorHtml(nextHtml);
        if (stripRichTextTags(normalized).length > DESCRIPTION_MAX_LENGTH) {
            requestAnimationFrame(() => {
                descriptionEditorRef.current?.setContentHTML(descriptionHtmlRef.current);
            });
            return;
        }

        descriptionHtmlRef.current = nextHtml;
        setDescription(normalized);
    }, []);

    const handleDescriptionToolbarStateChange = useCallback((items: Array<string | { type: string; value: string }>) => {
        const activeItems = new Set<string>();
        items.forEach((item) => {
            if (typeof item === 'string') {
                activeItems.add(item);
                return;
            }
            activeItems.add(item.type);
            if (typeof item.value === 'string') activeItems.add(item.value);
        });

        setFormatButtonState({
            bold: activeItems.has(actions.setBold),
            italic: activeItems.has(actions.setItalic),
            underline: activeItems.has(actions.setUnderline),
        });
    }, []);

    const handleDescriptionEditorInitialized = useCallback(() => {
        if (descriptionToolbarRegisteredRef.current) return;
        const editor = descriptionEditorRef.current;
        if (!editor) return;

        editor.registerToolbar(handleDescriptionToolbarStateChange);
        descriptionToolbarRegisteredRef.current = true;
    }, [handleDescriptionToolbarStateChange]);

    const handleApplyDescriptionStyle = useCallback((tag: keyof typeof DESCRIPTION_TAG_ACTION) => {
        const editor = descriptionEditorRef.current;
        if (!editor) return;

        const action = DESCRIPTION_TAG_ACTION[tag];
        if (!action) return;

        (editor as any)?.showAndroidKeyboard?.();
        editor.sendAction(action, 'result');

        if (descriptionFocusedRef.current) {
            requestAnimationFrame(() => editor.focusContentEditor());
        }
    }, []);

    const handleDescriptionEditorFocus = useCallback(() => {
        descriptionFocusedRef.current = true;
    }, []);

    const handleDescriptionEditorBlur = useCallback(() => {
        descriptionFocusedRef.current = false;
    }, []);

    const handleSaveDraft = async () => {
        if (!draft?.selectedAssets?.length) {
            Alert.alert('Medya Seçilmedi', 'Taslak kaydetmek için medya seçin.');
            return;
        }
        if (!user?.id) {
            Alert.alert('Giriş Gerekli', 'Taslak kaydetmek için lütfen giriş yapın.');
            return;
        }

        try {
            await createDraft({
                userId: user.id,
                mediaUri: draft.selectedAssets[0].uri,
                mediaType: draft.selectedAssets[0].type === 'video' ? 'video' : 'image',
                thumbnailUri: draft.selectedAssets[0].uri,
                description,
                commercialType: commercialType || undefined,
                brandName,
                brandUrl,
                tags,
                useAILabel,
                uploadMode: draft.uploadMode,
            });
            Alert.alert('Taslak Kaydedildi', 'Taslak başarıyla kaydedildi.');
            clearDraft();
            router.back();
        } catch (error) {
            logError(LogCode.DRAFT_SAVE, 'Error saving draft', error);
            Alert.alert('Hata', 'Taslak kaydedilirken bir hata oluştu.');
        }
    };

    const handleShare = async () => {
        if (isSubmitting) return;
        if (!draft?.selectedAssets?.length) {
            Alert.alert('Medya Seçilmedi', 'Lütfen yüklemek için medya seçin.');
            return;
        }
        if (!user?.id) {
            Alert.alert('Giriş Gerekli', 'Video yüklemek için lütfen giriş yapın.');
            return;
        }
        if (!commercialType) {
            Alert.alert('Ticari İlişki Zorunlu', 'Lütfen ticari ilişki türünü seçin.');
            return;
        }

        setIsSubmitting(true);
        startUpload();
        if (draft.selectedAssets[0]?.uri) setThumbnailUri(draft.selectedAssets[0].uri);

        router.replace('/(tabs)' as any);

        const formData = new FormData();
        formData.append('userId', user.id);
        formData.append('description', description);
        formData.append('commercialType', commercialType);
        formData.append('coverIndex', String(draft.coverAssetIndex));
        if (typeof draft.coverTimeSec === 'number' && draft.coverTimeSec >= 0) {
            formData.append('coverTimeSec', String(draft.coverTimeSec));
        }
        formData.append('qualityPreset', draft.qualityPreset);
        formData.append('subtitleLanguage', draft.subtitleLanguage);
        if (draft.trimEndSec > draft.trimStartSec) {
            formData.append('trimStartSec', String(draft.trimStartSec));
            formData.append('trimEndSec', String(draft.trimEndSec));
        }

        if (commercialType !== 'İş Birliği İçermiyor' && commercialType !== 'Kendi Markam') {
            if (brandName) formData.append('brandName', brandName);
            if (brandUrl) formData.append('brandUrl', brandUrl);
        }

        const preparedAssets: Array<any> = draft.selectedAssets.map((asset) => ({
            ...asset,
            sourceUri: asset.uri,
        }));

        preparedAssets.forEach((asset, index) => {
            const isVideo = asset.type === 'video';
            const extension = isVideo ? 'mp4' : 'jpg';
            const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';
            formData.append('video', {
                uri: asset.uri,
                type: mimeType,
                name: `upload_${index}.${extension}`,
            } as any);
        });

        if (draft.subtitleLanguage !== 'none') {
            const manualSubtitles = preparedAssets
                .map((asset, index) => {
                    if (asset.type !== 'video') return null;
                    const originalUri = asset.sourceUri || asset.uri;
                    const cached = subtitleCache[originalUri];
                    if (!cached?.segments?.length) return null;
                    return {
                        index,
                        language: draft.subtitleLanguage || 'auto',
                        segments: cached.segments,
                        presentation: subtitlePresentationCache[originalUri] || null,
                        style: subtitleStyleCache[originalUri] || null,
                    };
                })
                .filter(Boolean);

            if (manualSubtitles.length > 0) {
                formData.append('manualSubtitles', JSON.stringify(manualSubtitles));
            }
        }

        try {
            const xhr = new XMLHttpRequest();
            const endpoint = draft.uploadMode === 'story' ? '/upload-story' : '/upload-hls';
            const uploadUrl = `${CONFIG.API_URL}${endpoint}`;
            logData(LogCode.VIDEO_UPLOAD_START, 'Starting upload', { uploadUrl, uploadMode: draft.uploadMode });
            xhr.open('POST', uploadUrl);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.access_token;
                if (accessToken) xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
            } catch {
                // ignore token fetch failure
            }

            let currentProgress = 0;
            let currentPhase: 'uploading' | 'processing' = 'uploading';
            setStatus('uploading');
            const progressInterval = setInterval(() => {
                if (currentProgress < 95) {
                    currentProgress += 1;
                    setProgress(currentProgress);
                    const nextPhase: 'uploading' | 'processing' = currentProgress < 80 ? 'uploading' : 'processing';
                    if (nextPhase !== currentPhase) {
                        currentPhase = nextPhase;
                        setStatus(nextPhase);
                    }
                }
            }, 300);

            xhr.onload = () => {
                clearInterval(progressInterval);
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    setProgress(100);
                    setTimeout(() => {
                        setSuccess(draft.uploadMode === 'story' ? '' : (response.data?.id || 'new-video'));
                        setIsSubmitting(false);
                        if (draft.uploadMode === 'story') {
                            triggerStoryRefresh();
                            setTimeout(() => {
                                resetUploadState();
                            }, 2000);
                        }
                        clearDraft();
                    }, 300);
                } else {
                    setError('Yükleme başarısız oldu.');
                    setStatus('error');
                    setIsSubmitting(false);
                }
            };

            xhr.onerror = () => {
                clearInterval(progressInterval);
                setError('Ağ hatası oluştu.');
                setStatus('error');
                setIsSubmitting(false);
            };

            xhr.send(formData);
        } catch (error) {
            logError(LogCode.EXCEPTION_UNCAUGHT, 'Upload exception caught', error);
            setError('Beklenmedik bir hata oluştu.');
            setStatus('error');
            setIsSubmitting(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            <SystemBars
                style={{
                    statusBar: isDark ? 'light' : 'dark',
                    navigationBar: isDark ? 'light' : 'dark',
                }}
            />
            <View style={[styles.header, { paddingTop: insets.top, backgroundColor: bgColor }]}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft color={textColor} size={32} strokeWidth={1.8} />
                    </Pressable>
                </View>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>{title}</Text>
                </View>
                <View style={styles.headerRight} />
            </View>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={[styles.descriptionSection, { backgroundColor: inputBg }]}>
                    <RichEditor
                        ref={descriptionEditorRef}
                        style={styles.descriptionEditor}
                        initialHeight={120}
                        placeholder="Bir açıklama yaz ve konu etiketleri ekle..."
                        editorInitializedCallback={handleDescriptionEditorInitialized}
                        onChange={handleDescriptionChange}
                        onFocus={handleDescriptionEditorFocus}
                        onBlur={handleDescriptionEditorBlur}
                        styleWithCSS={false}
                        defaultParagraphSeparator="div"
                        pasteAsPlainText={false}
                        editorStyle={{
                            backgroundColor: 'transparent',
                            color: textColor,
                            caretColor: '#0A84FF',
                            placeholderColor: subtextColor,
                            contentCSSText: `
                                font-size: ${EDITOR_FONT_SIZE}px;
                                line-height: ${EDITOR_LINE_HEIGHT}px;
                                white-space: pre-wrap;
                                word-break: break-word;
                                margin: 0;
                                padding: 0;
                            `,
                        }}
                    />
                </View>
                <View style={styles.formatToolbarContainer}>
                    <View style={styles.formatToolbar}>
                        <Pressable
                            style={[
                                styles.formatButton,
                                { borderColor },
                                formatButtonState.bold && {
                                    backgroundColor: selectedFormatButtonBg,
                                    borderColor: selectedFormatButtonBorder,
                                },
                            ]}
                            onPress={() => handleApplyDescriptionStyle('b')}
                        >
                            <Text style={[styles.formatButtonText, { color: textColor, fontWeight: '700' }]}>B</Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.formatButton,
                                { borderColor },
                                formatButtonState.italic && {
                                    backgroundColor: selectedFormatButtonBg,
                                    borderColor: selectedFormatButtonBorder,
                                },
                            ]}
                            onPress={() => handleApplyDescriptionStyle('i')}
                        >
                            <Text style={[styles.formatButtonText, { color: textColor, fontStyle: 'italic' }]}>I</Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.formatButton,
                                { borderColor },
                                formatButtonState.underline && {
                                    backgroundColor: selectedFormatButtonBg,
                                    borderColor: selectedFormatButtonBorder,
                                },
                            ]}
                            onPress={() => handleApplyDescriptionStyle('u')}
                        >
                            <Text style={[styles.formatButtonText, { color: textColor, textDecorationLine: 'underline' }]}>U</Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.section}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
                        {tags.map((tag, index) => (
                            <View key={index} style={[styles.tagChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)', borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)' }]}>
                                <Text style={[styles.tagHashIcon, { color: textColor }]}>#</Text>
                                <Text style={[styles.tagText, { color: textColor }]}>{tag}</Text>
                                <Pressable onPress={() => handleRemoveTag(index)} hitSlop={8}>
                                    <X size={14} color={subtextColor} />
                                </Pressable>
                            </View>
                        ))}
                        {tags.length < 5 ? (
                            <Pressable onPress={handleAddTag} style={[styles.addTagButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)', borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)' }]}>
                                <Text style={[styles.tagHashIcon, { color: textColor }]}>#</Text>
                                <PlusCircle size={16} color="#007AFF" />
                            </Pressable>
                        ) : null}
                    </ScrollView>
                </View>

                <View style={styles.menuSection}>
                    <Pressable style={[styles.menuItem, { borderBottomColor: borderColor }]} onPress={handleClubsSelect}>
                        <View style={styles.menuItemLeft}>
                            <Users color={textColor} size={24} />
                            <Text style={[styles.menuItemText, { color: textColor }]}>CLUB&apos;s ekle</Text>
                        </View>
                        <ChevronRight color={subtextColor} size={20} />
                    </Pressable>

                    <Pressable style={[styles.menuItem, { borderBottomColor: borderColor }]} onPress={() => setShowCommercialMenu(true)}>
                        <View style={styles.menuItemLeft}>
                            <Tag color={textColor} size={24} />
                            <Text style={[styles.menuItemText, { color: textColor }]}>
                                Ticari İlişki Ekle
                                <Text style={styles.requiredStar}> *</Text>
                            </Text>
                        </View>
                        <View style={styles.menuItemRight}>
                            {commercialType ? (
                                <Text style={[styles.selectedValueText, { color: subtextColor }]} numberOfLines={1}>{commercialType}</Text>
                            ) : null}
                            <ChevronRight color={subtextColor} size={20} />
                        </View>
                    </Pressable>

                    <View style={[styles.menuItem, { borderBottomColor: 'transparent' }]}>
                        <View style={styles.menuItemLeft}>
                            <AiIcon width={28} height={28} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.menuItemText, { color: textColor }]}>Yapay zeka etiketi ekle</Text>
                                <Text style={[styles.aiDescription, { color: subtextColor }]}>
                                    Yapay zekayla oluşturulan belirli gerçekçi içerikleri etiketlemeni zorunlu tutuyoruz.
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={useAILabel}
                            onValueChange={setUseAILabel}
                            trackColor={{ false: '#767577', true: '#3A8DFF' }}
                            thumbColor={useAILabel ? '#FFFFFF' : '#F4F3F4'}
                        />
                    </View>
                </View>
            </ScrollView>

            <View style={[styles.bottomButtons, { backgroundColor: bgColor, borderTopColor: borderColor, paddingBottom: insets.bottom + 12 }]}>
                <Pressable
                    style={[styles.draftButton, { backgroundColor: modalTheme.sheetCard }]}
                    onPress={handleSaveDraft}
                    disabled={isSubmitting}
                >
                    <Text style={[styles.draftButtonText, { color: textColor }]}>Taslağı Kaydet</Text>
                </Pressable>
                <Pressable
                    style={[styles.shareButton, (!commercialType || isSubmitting) && styles.shareButtonDisabled]}
                    onPress={handleShare}
                    disabled={!commercialType || isSubmitting}
                >
                    <Text style={styles.shareButtonText}>Paylaş</Text>
                </Pressable>
            </View>

            <Modal visible={showCommercialMenu} transparent animationType="fade" onRequestClose={() => setShowCommercialMenu(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowCommercialMenu(false)}>
                    <View style={[styles.menuModal, { backgroundColor: modalTheme.sheetCard, borderColor }]}>
                        <View style={[styles.menuHeader, { borderBottomColor: borderColor }]}>
                            <Text style={[styles.menuTitle, { color: textColor }]}>Ticari İlişki Türü Seçin</Text>
                        </View>
                        <ScrollView style={styles.menuList}>
                            {COMMERCIAL_TYPES.map((type) => (
                                <Pressable
                                    key={type}
                                    style={[styles.menuOptionItem, { borderBottomColor: borderColor }]}
                                    onPress={() => {
                                        setCommercialType(type);
                                        setShowCommercialMenu(false);
                                    }}
                                >
                                    <Text style={[styles.menuOptionText, { color: textColor }]}>{type}</Text>
                                    {commercialType === type ? <Text style={[styles.checkmark, { color: modalTheme.accent }]}>✓</Text> : null}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            <Modal visible={showTagInputModal} transparent animationType="fade" onRequestClose={() => setShowTagInputModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowTagInputModal(false)}>
                    <View style={[styles.menuModal, { backgroundColor: modalTheme.sheetCard, borderColor }]}>
                        <View style={[styles.menuHeader, { borderBottomColor: borderColor }]}>
                            <Text style={[styles.menuTitle, { color: textColor }]}>Konu Etiketi Ekle</Text>
                        </View>
                        <View style={styles.brandFormSection}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={[styles.brandFormLabel, { color: textColor, fontSize: 18 }]}>#</Text>
                                <TextInput
                                    style={[styles.brandFormInput, { flex: 1, backgroundColor: inputBg, color: textColor, borderColor }]}
                                    placeholder="etiket giriniz"
                                    placeholderTextColor={subtextColor}
                                    value={currentTagInput}
                                    onChangeText={setCurrentTagInput}
                                    maxLength={30}
                                    autoCapitalize="none"
                                />
                            </View>
                            <View style={styles.tagInputActions}>
                                <Pressable style={[styles.cancelTagButton, { borderColor }]} onPress={() => setShowTagInputModal(false)}>
                                    <Text style={[styles.cancelTagButtonText, { color: textColor }]}>Vazgeç</Text>
                                </Pressable>
                                <Pressable style={[styles.saveTagButton, { backgroundColor: modalTheme.accent }]} onPress={handleSaveTag}>
                                    <Text style={styles.saveTagButtonText}>Ekle</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 82,
    },
    headerLeft: { width: 60, alignItems: 'flex-start' },
    headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerRight: { width: 60 },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },
    scrollView: { flex: 1 },
    descriptionSection: { marginHorizontal: 20, marginTop: 12, borderRadius: 12, padding: 12 },
    descriptionEditor: {
        minHeight: 120,
        fontSize: EDITOR_FONT_SIZE,
        lineHeight: EDITOR_LINE_HEIGHT,
    },
    formatToolbarContainer: { marginHorizontal: 20, marginTop: 8 },
    formatToolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    formatButton: { minWidth: 34, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    formatButtonText: { fontSize: 16 },
    section: { marginTop: 14 },
    tagsScroll: { paddingHorizontal: 20 },
    tagChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 10, height: 34, borderRadius: 17, marginRight: 8, gap: 6 },
    tagHashIcon: { fontSize: 14, fontWeight: '700' },
    tagText: { fontSize: 14, fontWeight: '500' },
    addTagButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 10, height: 34, borderRadius: 17, gap: 6 },
    menuSection: { marginTop: 18, marginHorizontal: 20 },
    menuItem: { minHeight: 62, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    menuItemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    menuItemText: { fontSize: 16, fontWeight: '500' },
    menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    selectedValueText: { fontSize: 13, maxWidth: 160 },
    requiredStar: { color: '#FF3B30', fontWeight: '700' },
    aiDescription: { marginTop: 2, fontSize: 12, lineHeight: 16 },
    bottomButtons: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
    draftButton: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    draftButtonText: { fontSize: 15, fontWeight: '600' },
    shareButton: { flex: 1, height: 48, borderRadius: 12, backgroundColor: '#0A84FF', justifyContent: 'center', alignItems: 'center' },
    shareButtonDisabled: { opacity: 0.45 },
    shareButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 20 },
    menuModal: { borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
    menuHeader: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    menuTitle: { fontSize: 16, fontWeight: '700' },
    menuList: { maxHeight: 320 },
    menuOptionItem: { minHeight: 48, borderBottomWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    menuOptionText: { fontSize: 15 },
    checkmark: { fontSize: 16, fontWeight: '700' },
    brandFormSection: { padding: 16 },
    brandFormLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
    brandFormInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 15 },
    tagInputActions: { marginTop: 16, flexDirection: 'row', gap: 10 },
    cancelTagButton: { flex: 1, height: 42, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    cancelTagButtonText: { fontSize: 14, fontWeight: '600' },
    saveTagButton: { flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    saveTagButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
