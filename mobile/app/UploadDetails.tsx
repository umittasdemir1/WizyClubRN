import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, CircleUserRound, MapPinCheckInside, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { SystemBars } from 'react-native-edge-to-edge';
import { RichEditor, actions } from 'react-native-pell-rich-editor';
import { useVideoPlayer } from 'expo-video';
import AiIcon from '../assets/icons/ai.svg';
import CommunityIcon from '../assets/icons/community.svg';
import PartnershipIcon from '../assets/icons/partnership.svg';
import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { useSurfaceTheme } from '../src/presentation/hooks/useSurfaceTheme';
import { useUploadComposerStore } from '../src/presentation/store/useUploadComposerStore';
import { useAuthStore } from '../src/presentation/store/useAuthStore';
import { useDraftStore } from '../src/presentation/store/useDraftStore';
import { useUploadStore } from '../src/presentation/store/useUploadStore';
import { useStoryStore } from '../src/presentation/store/useStoryStore';
import { getAccessToken } from '../src/presentation/store/getAccessToken';
import { CONFIG } from '../src/core/config';
import { LogCode, logData, logError } from '@/core/services/Logger';
import { stripRichTextTags } from '../src/core/utils/richText';
import type { UploadedVideoPayload } from '../src/presentation/store/useUploadStore';

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
const TOPIC_SUGGESTIONS = [
    'kesfet',
    'trend',
    'stil',
    'moda',
    'bakim',
    'makyaj',
    'ciltbakimi',
    'sacbakimi',
    'kombin',
    'gunlukrutin',
    'yemektarifi',
    'seyahat',
    'spor',
    'fitness',
    'wellness',
    'saglikliyasam',
    'kahveritueli',
    'tatli',
    'evdebakim',
    'minimalyasam',
    'dekorasyon',
    'teknoloji',
    'mobilfotografcilik',
    'icerikuretim',
    'vlog',
    'kamp',
    'haftasonu',
    'sokakstili',
    'dogalurunler',
    'alisveris',
    'yenisezon',
    'ilham',
];
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DESCRIPTION_MAX_LENGTH = 2200;
const DESCRIPTION_MIN_HEIGHT = 72;
const EDITOR_FONT_SIZE = 15;
const EDITOR_LINE_HEIGHT = 21;
const TOPIC_SUGGESTION_HEADER_HEIGHT = 44;
const TOPIC_SUGGESTION_ROW_HEIGHT = 38;
const TOPIC_SUGGESTION_VISIBLE_ROWS = 10;
const TOPIC_SUGGESTION_MODAL_HEIGHT = 350;
const PREVIEW_ASPECT_RATIO = 16 / 9;
const PREVIEW_WIDTH = SCREEN_WIDTH;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * PREVIEW_ASPECT_RATIO;
const PREVIEW_SCALE_WHEN_DESCRIPTION_EDITOR_OPEN = 0.44;
const PREVIEW_MENU_GAP_WHEN_DESCRIPTION_EDITOR_OPEN = 0;
const PREVIEW_TOP_GAP_WHEN_DESCRIPTION_EDITOR_OPEN = 20;
const PREVIEW_COLLAPSED_TRANSLATE_Y = (
    PREVIEW_TOP_GAP_WHEN_DESCRIPTION_EDITOR_OPEN -
    (PREVIEW_HEIGHT * (1 - PREVIEW_SCALE_WHEN_DESCRIPTION_EDITOR_OPEN)) / 2
) / PREVIEW_SCALE_WHEN_DESCRIPTION_EDITOR_OPEN;
const PREVIEW_COLLAPSED_MARGIN_BOTTOM =
    PREVIEW_MENU_GAP_WHEN_DESCRIPTION_EDITOR_OPEN -
    (PREVIEW_HEIGHT * (1 - PREVIEW_SCALE_WHEN_DESCRIPTION_EDITOR_OPEN)) / 2 +
    (PREVIEW_SCALE_WHEN_DESCRIPTION_EDITOR_OPEN * PREVIEW_COLLAPSED_TRANSLATE_Y);
const PREVIEW_OVERLAY_UI_SCALE = 1 / PREVIEW_SCALE_WHEN_DESCRIPTION_EDITOR_OPEN;
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
type PreviewImageSource = React.ComponentProps<typeof Image>['source'];

const getUriCandidate = (value: unknown): string | null => {
    if (typeof value === 'string' && value.trim().length > 0) return value;
    if (value && typeof value === 'object' && 'uri' in value) {
        const uri = (value as { uri?: unknown }).uri;
        if (typeof uri === 'string' && uri.trim().length > 0) return uri;
    }
    return null;
};

const pickPreferredUri = (...values: unknown[]): string | null => {
    for (const value of values) {
        const uri = getUriCandidate(value);
        if (uri) return uri;
    }
    return null;
};

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

const extractTopicTags = (input: string): string[] => {
    const plainText = stripRichTextTags(input);
    const matches = plainText.match(/(^|\s)#([^\s#]+)/g) ?? [];
    const nextTags: string[] = [];

    matches.forEach((match) => {
        if (nextTags.length >= 5) return;

        const normalized = match.trim().replace(/^#/, '');
        if (!normalized) return;

        nextTags.push(normalized);
    });

    return nextTags;
};

const extractActiveTopicQuery = (input: string): string | null => {
    const plainText = stripRichTextTags(input);
    const match = plainText.match(/(?:^|\s)#([^\s#]*)$/);
    if (!match) return null;

    return match[1] ?? '';
};

const getActiveTopicLineIndex = (input: string): number | null => {
    const plainText = stripRichTextTags(input);
    const match = plainText.match(/(?:^|\s)#([^\s#]*)$/);
    if (!match) return null;

    const triggerIndex = plainText.lastIndexOf('#');
    if (triggerIndex < 0) return null;

    return (plainText.slice(0, triggerIndex).match(/\n/g) ?? []).length;
};

export default function UploadDetailsScreen() {
    const insets = useSafeAreaInsets();
    const isDark = useThemeStore((state) => state.isDark);
    const modalTheme = useSurfaceTheme(isDark);
    const { user } = useAuthStore();
    const { createDraft } = useDraftStore();
    const triggerStoryRefresh = useStoryStore((state) => state.triggerRefresh);
    const {
        startUpload,
        setProgress,
        setStatus,
        setSuccess,
        setError,
        setThumbnailUri,
        setTaggedPeoplePreview,
        reset: resetUploadState,
    } = useUploadStore();
    const draft = useUploadComposerStore((state) => state.draft);
    const coverPreviewSource = useUploadComposerStore((state) => state.coverPreviewSource);
    const setCoverPreviewSource = useUploadComposerStore((state) => state.setCoverPreviewSource);
    const subtitleCache = useUploadComposerStore((state) => state.subtitleCache);
    const subtitlePresentationCache = useUploadComposerStore((state) => state.subtitlePresentationCache);
    const subtitleStyleCache = useUploadComposerStore((state) => state.subtitleStyleCache);
    const clearDraft = useUploadComposerStore((state) => state.clearDraft);
    const isEditMode = !!draft?.editVideoId;
    const descriptionEditorRef = useRef<RichEditor | null>(null);
    const descriptionHtmlRef = useRef('');
    const descriptionToolbarRegisteredRef = useRef(false);
    const descriptionFocusedRef = useRef(false);

    const [description, setDescription] = useState(() => {
        if (!draft?.editDescription && !draft?.editTags?.length) return '';
        const base = draft?.editDescription ?? '';
        if (!draft?.editTags?.length) return base;
        const existingTags = new Set(extractTopicTags(base).map(t => t.toLocaleLowerCase('tr-TR')));
        const missingTags = draft.editTags.filter(t => !existingTags.has(t.toLocaleLowerCase('tr-TR')));
        if (missingTags.length === 0) return base;
        const tagSuffix = missingTags.map(t => `#${t}`).join(' ');
        return base ? `${base}\n${tagSuffix}` : tagSuffix;
    });
    const [formatButtonState, setFormatButtonState] = useState({
        bold: false,
        italic: false,
        underline: false,
    });
    const [commercialType, setCommercialType] = useState<string | null>(draft?.editCommercialType ?? null);
    const [brandName, setBrandName] = useState(draft?.editBrandName ?? '');
    const [brandUrl, setBrandUrl] = useState(draft?.editBrandUrl ?? '');
    const [useAILabel, setUseAILabel] = useState(false);
    const [showCommercialMenu, setShowCommercialMenu] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);
    const [descriptionEditorHeight, setDescriptionEditorHeight] = useState(DESCRIPTION_MIN_HEIGHT);
    const [descriptionSectionY, setDescriptionSectionY] = useState(0);
    const [dismissedTopicSuggestionSignature, setDismissedTopicSuggestionSignature] = useState<string | null>(null);

    const bgColor = modalTheme.fullScreenBackground;
    const textColor = modalTheme.textPrimary;
    const subtextColor = modalTheme.textSecondary;
    const borderColor = modalTheme.sheetBorder;
    const inputBg = modalTheme.inputBackground;
    const formatButtonBorderColor = '#FFFFFF';
    const selectedFormatButtonBg = '#FFFFFF';
    const selectedFormatButtonBorder = '#FFFFFF';
    const topicTags = useMemo(() => extractTopicTags(description), [description]);
    const taggedPeople = draft?.taggedPeople ?? draft?.editTaggedPeople ?? [];
    const visibleTaggedPeople = useMemo(
        () => (taggedPeople.length > 5 ? taggedPeople.slice(0, 4) : taggedPeople.slice(0, 5)),
        [taggedPeople]
    );
    const hasTaggedPeopleOverflow = taggedPeople.length > 5;
    const activeTopicQuery = useMemo(() => extractActiveTopicQuery(description), [description]);
    const activeTopicLineIndex = useMemo(() => getActiveTopicLineIndex(description), [description]);
    const topicSuggestions = useMemo(() => {
        if (activeTopicQuery === null) return [];

        const normalizedQuery = activeTopicQuery.trim().toLocaleLowerCase('tr-TR');
        const matches = TOPIC_SUGGESTIONS.filter((item) =>
            normalizedQuery.length === 0
                ? true
                : item.toLocaleLowerCase('tr-TR').startsWith(normalizedQuery)
        );

        return matches;
    }, [activeTopicQuery]);
    const showTopicSuggestionModal =
        isDescriptionFocused && activeTopicQuery !== null && dismissedTopicSuggestionSignature !== description;
    const topicSuggestionModalTop = useMemo(() => {
        if (activeTopicLineIndex === null) return 0;
        return descriptionSectionY + (activeTopicLineIndex + 1) * EDITOR_LINE_HEIGHT + 10;
    }, [activeTopicLineIndex, descriptionSectionY]);
    const previewAsset = useMemo(() => {
        if (isEditMode) return null;
        if (!draft?.selectedAssets?.length) return null;

        const rawIndex = typeof draft.coverAssetIndex === 'number' ? draft.coverAssetIndex : 0;
        const safeIndex = Math.min(Math.max(rawIndex, 0), draft.selectedAssets.length - 1);

        return draft.selectedAssets[safeIndex] ?? draft.selectedAssets[0] ?? null;
    }, [draft, isEditMode]);
    const [generatedPreviewImageSource, setGeneratedPreviewImageSource] = useState<PreviewImageSource>(null);

    const title = useMemo(() => {
        if (!draft) return 'Gönderi Oluştur';
        if (isEditMode) return 'Gönderiyi Düzenle';
        if (draft.uploadMode === 'story') return 'Hikaye Oluştur';
        return 'Gönderi Oluştur';
    }, [draft, isEditMode]);

    const explicitPreviewImageSource = useMemo<PreviewImageSource>(() => {
        if (!previewAsset) return null;

        const draftRecord = draft as Record<string, unknown> | null;
        const previewAssetRecord = previewAsset as Record<string, unknown>;
        const preferredUri = pickPreferredUri(
            draftRecord?.manualThumbnailUri,
            draftRecord?.selectedThumbnailUri,
            draftRecord?.thumbnailUri,
            draftRecord?.selectedThumbnail,
            previewAssetRecord.manualThumbnailUri,
            previewAssetRecord.selectedThumbnailUri,
            previewAssetRecord.thumbnailUri,
            previewAssetRecord.selectedThumbnail,
            previewAssetRecord.thumbnail,
            previewAssetRecord.previewUri,
            previewAssetRecord.posterUri,
        );

        if (preferredUri) return { uri: preferredUri };
        if (previewAsset.type !== 'video') return { uri: previewAsset.uri };
        return null;
    }, [draft, previewAsset]);
    const previewThumbnailTimeSec = useMemo(() => {
        if (typeof draft?.coverTimeSec !== 'number' || !Number.isFinite(draft.coverTimeSec)) return 0;
        return Math.max(0, draft.coverTimeSec);
    }, [draft?.coverTimeSec]);
    const shouldGeneratePreviewThumbnail = previewAsset?.type === 'video' && !explicitPreviewImageSource;
    const previewVideoUriForThumbnail = shouldGeneratePreviewThumbnail && previewAsset ? previewAsset.uri : null;
    const previewThumbnailPlayer = useVideoPlayer(previewVideoUriForThumbnail);
    const previewImageSource = (coverPreviewSource as PreviewImageSource) ?? explicitPreviewImageSource ?? generatedPreviewImageSource;
    const explicitSelectedPreviewUri = useMemo(() => {
        const draftRecord = draft as Record<string, unknown> | null;
        return pickPreferredUri(
            draftRecord?.selectedThumbnailUri,
            draftRecord?.manualThumbnailUri,
        );
    }, [draft]);
    const uploadPreviewThumbnailUri = useMemo(() => pickPreferredUri(
        explicitSelectedPreviewUri,
        previewImageSource,
        previewAsset?.uri,
    ), [explicitSelectedPreviewUri, previewImageSource, previewAsset?.uri]);
    const canCreateCover = !isEditMode && previewAsset?.type === 'video';

    useEffect(() => {
        let isCancelled = false;

        if (!shouldGeneratePreviewThumbnail) {
            setGeneratedPreviewImageSource(null);
            return () => {
                isCancelled = true;
            };
        }

        setGeneratedPreviewImageSource(null);

        const requestedTimes = previewThumbnailTimeSec > 0 ? [previewThumbnailTimeSec, 0] : [0];

        void previewThumbnailPlayer
            .generateThumbnailsAsync(requestedTimes, {
                maxWidth: Math.round(PREVIEW_WIDTH),
                maxHeight: Math.round(PREVIEW_HEIGHT),
            })
            .then((thumbnails) => {
                if (isCancelled) return;

                const preferredThumbnail = thumbnails.find(
                    (thumbnail) => Math.abs(thumbnail.requestedTime - previewThumbnailTimeSec) < 0.01
                ) ?? thumbnails[0] ?? null;

                setGeneratedPreviewImageSource((preferredThumbnail ?? null) as PreviewImageSource);
            })
            .catch((error) => {
                if (isCancelled) return;
                logError(LogCode.MEDIA_PICKER_ERROR, 'Failed to generate upload preview thumbnail', error);
                setGeneratedPreviewImageSource(null);
            });

        return () => {
            isCancelled = true;
        };
    }, [previewThumbnailPlayer, previewThumbnailTimeSec, shouldGeneratePreviewThumbnail]);

    useEffect(() => {
        if (activeTopicQuery === null && dismissedTopicSuggestionSignature !== null) {
            setDismissedTopicSuggestionSignature(null);
        }
    }, [activeTopicQuery, dismissedTopicSuggestionSignature]);

    const handleAddTag = useCallback(() => {
        setDismissedTopicSuggestionSignature(null);
        const editor = descriptionEditorRef.current;
        if (!editor) return;

        (editor as any)?.showAndroidKeyboard?.();
        editor.focusContentEditor();

        requestAnimationFrame(() => {
            editor.insertText('#');
        });
    }, []);
    const handleAddPerson = () => {
        router.push('/tag-people' as any);
    };
    const handleOpenCoverCreator = () => {
        if (!canCreateCover) return;
        setCoverPreviewSource(previewImageSource ?? null);
        router.push('/cover-create' as any);
    };
    const handleAddLocation = () => {
        Alert.alert('Bilgi', 'Konum ekleme seçimi sonraki adımda bağlanacak.');
    };
    const handleSelectTopicSuggestion = useCallback((suggestion: string) => {
        if (activeTopicQuery === null) return;

        const editor = descriptionEditorRef.current;
        if (!editor) return;

        const normalizedSuggestion = suggestion.toLocaleLowerCase('tr-TR');
        const normalizedQuery = activeTopicQuery.toLocaleLowerCase('tr-TR');
        const suffix = normalizedSuggestion.startsWith(normalizedQuery)
            ? suggestion.slice(activeTopicQuery.length)
            : suggestion;

        (editor as any)?.showAndroidKeyboard?.();
        editor.focusContentEditor();

        requestAnimationFrame(() => {
            editor.insertText(`${suffix} `);
        });
    }, [activeTopicQuery]);
    const handleCloseTopicSuggestionModal = useCallback(() => {
        setDismissedTopicSuggestionSignature(description);
    }, [description]);

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
        setIsDescriptionFocused(true);
    }, []);

    const handleDescriptionEditorBlur = useCallback(() => {
        descriptionFocusedRef.current = false;
        setIsDescriptionFocused(false);
    }, []);
    const handleDescriptionHeightChange = useCallback((height: number) => {
        const nextHeight = Math.max(DESCRIPTION_MIN_HEIGHT, Math.ceil(height));
        setDescriptionEditorHeight((current) => current === nextHeight ? current : nextHeight);
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
                thumbnailUri: explicitSelectedPreviewUri ?? draft.selectedAssets[0].uri,
                description,
                commercialType: commercialType || undefined,
                brandName,
                brandUrl,
                tags: topicTags,
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
        setThumbnailUri(uploadPreviewThumbnailUri ?? draft.selectedAssets[0]?.uri ?? null);
        setTaggedPeoplePreview(draft.taggedPeople ?? []);

        router.replace('/(tabs)' as any);

        const formData = new FormData();
        formData.append('userId', user.id);
        formData.append('description', description);
        formData.append('commercialType', commercialType);
        formData.append('tags', JSON.stringify(topicTags));
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

        if (draft.taggedPeople && draft.taggedPeople.length > 0) {
            formData.append('taggedPeople', JSON.stringify(draft.taggedPeople.map(p => p.id)));
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
                const accessToken = await getAccessToken();
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
                    const uploadedVideoPayload =
                        draft.uploadMode === 'story'
                            ? null
                            : ((response?.data && typeof response.data === 'object') ? response.data as UploadedVideoPayload : null);
                    setProgress(100);
                    setTimeout(() => {
                        setSuccess(
                            draft.uploadMode === 'story' ? '' : (uploadedVideoPayload?.id || 'new-video'),
                            uploadedVideoPayload
                        );
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

    const handleEditSave = async () => {
        if (isSubmitting || !draft?.editVideoId) return;
        if (!user?.id) {
            Alert.alert('Giriş Gerekli', 'Düzenleme yapmak için lütfen giriş yapın.');
            return;
        }

        setIsSubmitting(true);

        try {
            const accessToken = await getAccessToken();
            if (!accessToken) {
                Alert.alert('Oturum Hatası', 'Lütfen tekrar giriş yapın.');
                setIsSubmitting(false);
                return;
            }

            const isCommercial = commercialType ? commercialType !== 'İş Birliği İçermiyor' : false;
            const editVideoUri = draft.editVideoUrl;
            const editedSubtitleEntry = editVideoUri ? subtitleCache[editVideoUri] : null;
            const editedSubtitlePresentation = editVideoUri
                ? (subtitlePresentationCache[editVideoUri] || null)
                : null;
            const editedSubtitleStyle = editVideoUri
                ? (subtitleStyleCache[editVideoUri] || null)
                : null;
            const shouldDeleteSubtitles = isEditMode && draft.subtitleLanguage === 'none';
            const shouldUpdateSubtitles = Boolean(
                !shouldDeleteSubtitles &&
                editVideoUri &&
                editedSubtitleEntry?.segments?.length
            );
            const subtitlePatchPayload = shouldDeleteSubtitles
                ? {
                    subtitleOperation: 'delete',
                }
                : (shouldUpdateSubtitles && editedSubtitleEntry)
                    ? {
                        subtitleOperation: 'update',
                        subtitleLanguage: draft.subtitleLanguage || 'auto',
                        subtitleSegments: editedSubtitleEntry.segments,
                        subtitlePresentation: editedSubtitlePresentation,
                        subtitleStyle: editedSubtitleStyle,
                    }
                    : {};

            const body: Record<string, any> = {
                description,
                commercialType: commercialType || null,
                isCommercial,
                tags: topicTags,
                ...subtitlePatchPayload,
            };

            if (commercialType && commercialType !== 'İş Birliği İçermiyor' && commercialType !== 'Kendi Markam') {
                body.brandName = brandName || null;
                body.brandUrl = brandUrl || null;
            } else {
                body.brandName = null;
                body.brandUrl = null;
            }

            if (taggedPeople.length > 0) {
                body.taggedPeople = taggedPeople.map(p => p.id);
            } else {
                body.taggedPeople = [];
            }

            const response = await fetch(`${CONFIG.API_URL}/videos/${draft.editVideoId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Güncelleme başarısız oldu.');
            }

            clearDraft();
            Alert.alert('Başarılı', 'Gönderi başarıyla güncellendi.');
            router.replace('/(tabs)' as any);
        } catch (error: any) {
            logError(LogCode.EXCEPTION_UNCAUGHT, 'Edit save exception', error);
            Alert.alert('Hata', error?.message || 'Güncelleme sırasında bir hata oluştu.');
        } finally {
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
                scrollEnabled={!showTopicSuggestionModal}
            >
                {(previewAsset || (isEditMode && draft?.editThumbnailUrl)) ? (
                    <View style={styles.previewSection}>
                        <View style={styles.previewPage}>
                            <View
                                style={[
                                    styles.previewContainer,
                                    {
                                        width: PREVIEW_WIDTH,
                                        height: PREVIEW_HEIGHT,
                                        transform: [
                                            { scale: PREVIEW_SCALE_WHEN_DESCRIPTION_EDITOR_OPEN },
                                            { translateY: PREVIEW_COLLAPSED_TRANSLATE_Y },
                                        ],
                                        marginBottom: PREVIEW_COLLAPSED_MARGIN_BOTTOM,
                                    },
                                ]}
                            >
                                {isEditMode && draft?.editThumbnailUrl ? (
                                    <Image
                                        source={{ uri: draft.editThumbnailUrl }}
                                        style={styles.previewMedia}
                                        contentFit="cover"
                                    />
                                ) : previewImageSource ? (
                                    <Image
                                        source={previewImageSource}
                                        style={styles.previewMedia}
                                        contentFit="cover"
                                    />
                                ) : (
                                    <View style={[styles.previewFallback, { backgroundColor: inputBg }]}>
                                        <Text style={[styles.previewFallbackText, { color: subtextColor }]}>
                                            Önizleme hazırlanıyor...
                                        </Text>
                                    </View>
                                )}
                                {canCreateCover ? (
                                    <View pointerEvents="box-none" style={styles.previewOverlayActions}>
                                        <Pressable
                                            onPress={handleOpenCoverCreator}
                                            style={styles.coverCreateButton}
                                        >
                                            <Text style={styles.coverCreateButtonText}>Kapak Oluştur</Text>
                                        </Pressable>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    </View>
                ) : null}
                <View
                    style={styles.descriptionSection}
                    onLayout={(event) => {
                        setDescriptionSectionY(event.nativeEvent.layout.y);
                    }}
                >
                    <RichEditor
                        ref={descriptionEditorRef}
                        style={[styles.descriptionEditor, { minHeight: descriptionEditorHeight }]}
                        initialHeight={DESCRIPTION_MIN_HEIGHT}
                        initialContentHTML={isEditMode ? description || undefined : undefined}
                        placeholder="Bir açıklama yaz ve konu etiketleri ekle..."
                        editorInitializedCallback={handleDescriptionEditorInitialized}
                        onChange={handleDescriptionChange}
                        onHeightChange={handleDescriptionHeightChange}
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
                            cssText: `
                                [placeholder]:empty:before,
                                [placeholder]:empty:focus:before {
                                    font-size: 14px;
                                    line-height: 20px;
                                }
                            `,
                        }}
                    />
                </View>
                <View style={styles.formatToolbarContainer}>
                    <View style={styles.formatToolbar}>
                        <View style={styles.formatToolbarButtons}>
                            <Pressable
                                style={[
                                    styles.formatButton,
                                    { borderColor: formatButtonBorderColor },
                                    formatButtonState.bold && {
                                        backgroundColor: selectedFormatButtonBg,
                                        borderColor: selectedFormatButtonBorder,
                                    },
                                ]}
                                onPress={() => handleApplyDescriptionStyle('b')}
                            >
                                <Text style={[styles.formatButtonText, { color: formatButtonState.bold ? bgColor : textColor, fontWeight: '700' }]}>B</Text>
                            </Pressable>
                            <Pressable
                                style={[
                                    styles.formatButton,
                                    { borderColor: formatButtonBorderColor },
                                    formatButtonState.italic && {
                                        backgroundColor: selectedFormatButtonBg,
                                        borderColor: selectedFormatButtonBorder,
                                    },
                                ]}
                                onPress={() => handleApplyDescriptionStyle('i')}
                            >
                                <Text style={[styles.formatButtonText, { color: formatButtonState.italic ? bgColor : textColor, fontStyle: 'italic' }]}>I</Text>
                            </Pressable>
                            <Pressable
                                style={[
                                    styles.formatButton,
                                    { borderColor: formatButtonBorderColor },
                                    formatButtonState.underline && {
                                        backgroundColor: selectedFormatButtonBg,
                                        borderColor: selectedFormatButtonBorder,
                                    },
                                ]}
                                onPress={() => handleApplyDescriptionStyle('u')}
                            >
                                <Text style={[styles.formatButtonText, { color: formatButtonState.underline ? bgColor : textColor, textDecorationLine: 'underline' }]}>U</Text>
                            </Pressable>
                        </View>
                        {topicTags.length < 5 ? (
                            <Pressable
                                onPress={handleAddTag}
                                style={[styles.addTagButton, styles.formatToolbarAddTagButton, { backgroundColor: inputBg }]}
                            >
                                <Text style={[styles.addTagButtonText, { color: textColor }]}># Konular ekle</Text>
                            </Pressable>
                        ) : null}
                    </View>
                </View>
                {showTopicSuggestionModal ? (
                    <View
                        style={[
                            styles.topicSuggestionModal,
                            {
                                backgroundColor: inputBg,
                                top: topicSuggestionModalTop,
                            },
                        ]}
                    >
                        <View style={styles.topicSuggestionHeader}>
                            <Text style={[styles.topicSuggestionHeaderText, { color: textColor }]}>Önerilen Konular</Text>
                            <Pressable
                                style={styles.topicSuggestionCloseButton}
                                onPress={handleCloseTopicSuggestionModal}
                                hitSlop={8}
                            >
                                <X color={subtextColor} size={18} />
                            </Pressable>
                        </View>
                        <View style={styles.topicSuggestionContent}>
                            {topicSuggestions.length > 0 ? (
                                <ScrollView
                                    style={styles.topicSuggestionScroll}
                                    showsVerticalScrollIndicator={false}
                                    keyboardShouldPersistTaps="handled"
                                    nestedScrollEnabled
                                >
                                    {topicSuggestions.map((item) => (
                                        <Pressable
                                            key={item}
                                            style={styles.topicSuggestionItem}
                                            onPress={() => handleSelectTopicSuggestion(item)}
                                        >
                                            <Text style={styles.topicSuggestionText}>{`#${item}`}</Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            ) : (
                                <View style={styles.topicSuggestionEmpty}>
                                    <Text style={[styles.topicSuggestionEmptyText, { color: subtextColor }]}>
                                        Uygun konu bulunamadı.
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                ) : null}

                <View style={styles.section}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
                        {topicTags.map((tag, index) => (
                            <View key={`${tag}-${index}`} style={[styles.tagChip, { backgroundColor: inputBg }]}>
                                <Text style={[styles.tagHashIcon, { color: textColor }]}>#</Text>
                                <Text style={[styles.tagText, { color: textColor }]}>{tag}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.menuSection}>
                    <Pressable style={[styles.menuItem, { borderBottomColor: borderColor }]} onPress={handleAddPerson}>
                        <View style={styles.menuItemLeft}>
                            <CircleUserRound color={textColor} size={24} />
                            <Text style={[styles.menuItemText, { color: textColor }]}>Kişileri etiketle</Text>
                        </View>
                        <View style={styles.menuItemRight}>
                            {taggedPeople.length > 0 ? (
                                <View style={styles.taggedPeoplePreview}>
                                    {visibleTaggedPeople.map((person, index) => (
                                        person.avatarUrl ? (
                                            <Image
                                                key={person.id}
                                                source={{ uri: person.avatarUrl }}
                                                style={[
                                                    styles.taggedPersonAvatar,
                                                    { borderColor: bgColor },
                                                    index > 0 && styles.taggedPersonAvatarOverlap,
                                                ]}
                                                contentFit="cover"
                                            />
                                        ) : (
                                            <View
                                                key={person.id}
                                                style={[
                                                    styles.taggedPersonAvatar,
                                                    styles.taggedPersonAvatarFallback,
                                                    { borderColor: bgColor },
                                                    index > 0 && styles.taggedPersonAvatarOverlap,
                                                ]}
                                            />
                                        )
                                    ))}
                                    {hasTaggedPeopleOverflow ? (
                                        <View
                                            style={[
                                                styles.taggedPersonAvatar,
                                                styles.taggedPersonPlusBadge,
                                                { borderColor: bgColor },
                                                visibleTaggedPeople.length > 0 && styles.taggedPersonAvatarOverlap,
                                            ]}
                                        >
                                            <Text style={styles.taggedPersonPlusText}>+</Text>
                                        </View>
                                    ) : null}
                                </View>
                            ) : null}
                            <ChevronRight color={subtextColor} size={20} />
                        </View>
                    </Pressable>

                    <Pressable style={[styles.menuItem, { borderBottomColor: borderColor }]} onPress={handleAddLocation}>
                        <View style={styles.menuItemLeft}>
                            <MapPinCheckInside color={textColor} size={24} />
                            <Text style={[styles.menuItemText, { color: textColor }]}>Konum ekle</Text>
                        </View>
                        <ChevronRight color={subtextColor} size={20} />
                    </Pressable>

                    <Pressable style={[styles.menuItem, { borderBottomColor: borderColor }]} onPress={handleClubsSelect}>
                        <View style={styles.menuItemLeft}>
                            <CommunityIcon width={24} height={24} color={textColor} />
                            <Text style={[styles.menuItemText, { color: textColor }]}>CLUB&apos;s ekle</Text>
                        </View>
                        <ChevronRight color={subtextColor} size={20} />
                    </Pressable>

                    <Pressable style={[styles.menuItem, { borderBottomColor: borderColor }]} onPress={() => setShowCommercialMenu(true)}>
                        <View style={styles.menuItemLeft}>
                            <PartnershipIcon width={24} height={24} color={textColor} />
                            <Text style={[styles.menuItemText, { color: textColor }]}>
                                İş birliği ekle
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
                                    Yapay zeka ile oluşturulan içerikleri destekliyoruz. Kullanıcı deneyimi ve yasal uyumluluk için yapay zeka ile oluşturulan içerikleri etiketlemeni istiyoruz.
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
                {isEditMode ? (
                    <>
                        <Pressable
                            style={[styles.draftButton, { backgroundColor: modalTheme.sheetCard }]}
                            onPress={() => {
                                clearDraft();
                                router.back();
                            }}
                            disabled={isSubmitting}
                        >
                            <Text style={[styles.draftButtonText, { color: textColor }]}>Vazgeç</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.shareButton, isSubmitting && styles.shareButtonDisabled]}
                            onPress={handleEditSave}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.shareButtonText}>Kaydet</Text>
                        </Pressable>
                    </>
                ) : (
                    <>
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
                    </>
                )}
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
    previewSection: {
        width: PREVIEW_WIDTH,
    },
    previewPage: {
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    previewContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        alignSelf: 'center',
    },
    previewMedia: {
        flex: 1,
    },
    previewFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    previewFallbackText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    previewOverlayActions: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 16 * PREVIEW_OVERLAY_UI_SCALE,
    },
    coverCreateButton: {
        minHeight: 40 * PREVIEW_OVERLAY_UI_SCALE,
        paddingHorizontal: 18 * PREVIEW_OVERLAY_UI_SCALE,
        borderRadius: 20 * PREVIEW_OVERLAY_UI_SCALE,
        backgroundColor: 'rgba(8,10,15,0.72)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverCreateButtonText: {
        color: '#FFFFFF',
        fontSize: 14 * PREVIEW_OVERLAY_UI_SCALE,
        fontWeight: '700',
        letterSpacing: 0.2 * PREVIEW_OVERLAY_UI_SCALE,
    },
    descriptionSection: { marginHorizontal: 20, marginTop: 14, position: 'relative' },
    descriptionEditor: {
        width: '100%',
    },
    topicSuggestionModal: {
        position: 'absolute',
        left: 10,
        right: 10,
        height: TOPIC_SUGGESTION_MODAL_HEIGHT,
        borderRadius: 8,
        borderWidth: 0,
        overflow: 'hidden',
        zIndex: 20,
        elevation: 6,
    },
    topicSuggestionHeader: {
        height: TOPIC_SUGGESTION_HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
    },
    topicSuggestionHeaderText: {
        fontSize: 16,
        fontWeight: '600',
    },
    topicSuggestionCloseButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topicSuggestionContent: {
        flex: 1,
    },
    topicSuggestionScroll: {
        flex: 1,
    },
    topicSuggestionItem: {
        minHeight: TOPIC_SUGGESTION_ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    topicSuggestionText: {
        fontSize: 15,
        fontWeight: '400',
        color: '#FFFFFF',
    },
    topicSuggestionEmpty: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
        justifyContent: 'center',
    },
    topicSuggestionEmptyText: {
        fontSize: 14,
    },
    formatToolbarContainer: { marginHorizontal: 20, marginTop: 8 },
    formatToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    formatToolbarButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    formatButton: { minWidth: 34, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    formatButtonText: { fontSize: 16 },
    section: { marginTop: 14 },
    tagsScroll: { paddingHorizontal: 20 },
    tagChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 34, borderRadius: 8, marginRight: 8, gap: 6 },
    tagHashIcon: { fontSize: 14, fontWeight: '600' },
    tagText: { fontSize: 14, fontWeight: '600' },
    addTagButton: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, height: 34, borderRadius: 17, marginRight: 8 },
    formatToolbarAddTagButton: { marginRight: 0, flexShrink: 0, borderRadius: 8 },
    addTagButtonText: { fontSize: 14, fontWeight: '600' },
    menuSection: { marginTop: 2, marginHorizontal: 20 },
    menuItem: { minHeight: 52, borderBottomWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
    menuItemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    menuItemText: { fontSize: 16, fontWeight: '500' },
    menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    taggedPeoplePreview: { flexDirection: 'row', alignItems: 'center', marginRight: 2 },
    taggedPersonAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#D9D9D9',
        borderWidth: 2,
        overflow: 'hidden',
    },
    taggedPersonAvatarOverlap: {
        marginLeft: -6,
    },
    taggedPersonAvatarFallback: {
        opacity: 0.9,
    },
    taggedPersonPlusBadge: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
    taggedPersonPlusText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 18,
    },
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
});
