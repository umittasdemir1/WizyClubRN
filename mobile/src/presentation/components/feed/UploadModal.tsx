import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Switch,
    ScrollView,
    Image,
    Dimensions,
    FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { useUploadStore } from '../../store/useUploadStore';
import { useDraftStore } from '../../store/useDraftStore';
import { ChevronLeft, ChevronRight, Users, Tag, PlusCircle, X } from 'lucide-react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';
import { CONFIG } from '../../../core/config';
import { router } from 'expo-router';
import { useStoryStore } from '../../store/useStoryStore';
import { SystemBars } from 'react-native-edge-to-edge';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_ITEM_WIDTH = SCREEN_WIDTH * 0.7;
const PREVIEW_ITEM_SPACING = 16;
const PREVIEW_SNAP_INTERVAL = PREVIEW_ITEM_WIDTH + PREVIEW_ITEM_SPACING;
const PREVIEW_SIDE_PADDING = Math.max(0, (SCREEN_WIDTH - PREVIEW_ITEM_WIDTH) / 2);

interface UploadModalProps {
    isVisible: boolean;
    onClose: () => void;
    initialAssets?: ImagePicker.ImagePickerAsset[];
    uploadMode?: 'story' | 'video'; // 'story' = stories table, 'video' = videos/feed table
}

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
    'Kendi Markam'
];

export function UploadModal({ isVisible, onClose, initialAssets, uploadMode = 'video' }: UploadModalProps) {
    const { isDark } = useThemeStore();
    const { user } = useAuthStore();
    const insets = useSafeAreaInsets();
    const [selectedAssets, setSelectedAssets] = useState<ImagePicker.ImagePickerAsset[]>(initialAssets || []);
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
    const [commercialType, setCommercialType] = useState<string | null>(null); // Zorunlu - başlangıçta null
    const [brandName, setBrandName] = useState('');
    const [brandUrl, setBrandUrl] = useState('');
    const [useAILabel, setUseAILabel] = useState(false);
    const [showCommercialMenu, setShowCommercialMenu] = useState(false);
    const [showBrandInfoModal, setShowBrandInfoModal] = useState(false);
    const [showTagInputModal, setShowTagInputModal] = useState(false);
    const [currentTagInput, setCurrentTagInput] = useState('');

    const triggerStoryRefresh = useStoryStore(state => state.triggerRefresh);

    useEffect(() => {
        if (isVisible) {
            SystemBars.setStyle({
                statusBar: isDark ? 'light' : 'dark',
                navigationBar: isDark ? 'light' : 'dark',
            });
            SystemBars.setHidden({ statusBar: false, navigationBar: false });
        }
    }, [isVisible, isDark]);

    // Sync with initialAssets when it changes
    useEffect(() => {
        if (initialAssets && initialAssets.length > 0) {
            setSelectedAssets(initialAssets);
        }
    }, [initialAssets]);

    const { startUpload, setProgress, setStatus, setSuccess, setError, setThumbnailUri } = useUploadStore();
    const { createDraft } = useDraftStore();

    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const bgColor = isDark ? '#000000' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A0A0A0' : '#6B6B6B';
    const borderColor = isDark ? '#2C2C2E' : '#E5E5E5';
    const inputBg = isDark ? '#1C1C1E' : '#F5F5F5';

    const handleSaveDraft = async () => {
        if (selectedAssets.length === 0) {
            Alert.alert('Medya Seçilmedi', 'Taslak kaydetmek için bir fotoğraf veya video seçin.');
            return;
        }

        if (!user?.id) {
            Alert.alert('Giriş Gerekli', 'Taslak kaydetmek için lütfen giriş yapın.');
            return;
        }

        try {
            await createDraft({
                userId: user.id,
                mediaUri: selectedAssets[0].uri,
                mediaType: selectedAssets[0].type === 'video' ? 'video' : 'image',
                thumbnailUri: selectedAssets[0].uri,
                description,
                commercialType: commercialType || undefined,
                brandName,
                brandUrl,
                tags,
                useAILabel,
                uploadMode: uploadMode as 'video' | 'story',
            });

            Alert.alert('Taslak Kaydedildi', 'Videonuz taslak olarak kaydedildi. Profil sayfanızdan erişebilirsiniz.');

            // Reset form
            setSelectedAssets([]);
            setDescription('');
            setCommercialType(null);
            setBrandName('');
            setBrandUrl('');
            setTags([]);
            setUseAILabel(false);

            onClose();
        } catch (error) {
            console.error('[UploadModal] Error saving draft:', error);
            Alert.alert('Hata', 'Taslak kaydedilirken bir hata oluştu.');
        }
    };

    const handleCoverEdit = () => {
        // TODO: Thumbnail seçim/düzenleme modal'ı aç
        console.log('Cover edit tapped');
    };

    const handleClubsSelect = () => {
        // TODO: CLUB seçim modal'ı aç
        console.log('Clubs select tapped');
    };

    const handleCommercialTypeSelect = () => {
        setShowCommercialMenu(true);
    };

    const selectCommercialType = (type: string) => {
        setCommercialType(type);
        setShowCommercialMenu(false);

        // Open brand info modal if the type requires brand details
        if (type !== 'İş Birliği İçermiyor' && type !== 'Kendi Markam') {
            setShowBrandInfoModal(true);
        }
    };

    const handleAddTag = () => {
        setShowTagInputModal(true);
    };

    const handleSaveTag = () => {
        if (currentTagInput.trim() && tags.length < 5) {
            setTags([...tags, currentTagInput.trim()]);
            setCurrentTagInput('');
            setShowTagInputModal(false);
        }
    };

    const handleRemoveTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };

    const handleShare = async () => {
        if (selectedAssets.length === 0) {
            Alert.alert('Medya Seçilmedi', 'Lütfen yüklemek için bir fotoğraf veya video seçin.');
            return;
        }

        // Check if user is logged in
        if (!user?.id) {
            Alert.alert('Giriş Gerekli', 'Video yüklemek için lütfen giriş yapın.');
            return;
        }

        // Validate Commercial Type (Zorunlu)
        if (!commercialType) {
            Alert.alert('Ticari İlişki Zorunlu', 'Lütfen ticari ilişki türünü seçin.');
            return;
        }

        onClose();
        startUpload();

        // 🔥 Set thumbnail for header display during upload
        if (selectedAssets[0]?.uri) {
            setThumbnailUri(selectedAssets[0].uri);
        }

        // 🔥 CRITICAL: Navigate back to Feed without reload - upload continues in background
        router.back();

        const formData = new FormData();
        formData.append('userId', user.id);
        formData.append('description', description);
        formData.append('commercialType', commercialType);

        // Add brand info if commercial type requires it
        if (commercialType !== 'İş Birliği İçermiyor' && commercialType !== 'Kendi Markam') {
            if (brandName) formData.append('brandName', brandName);
            if (brandUrl) formData.append('brandUrl', brandUrl);
        }

        // Append all assets
        selectedAssets.forEach((asset, index) => {
            const isVideo = asset.type === 'video';
            const fileExtension = isVideo ? 'mp4' : 'jpg';
            const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';

            formData.append('video', {
                uri: asset.uri,
                type: mimeType,
                name: `upload_${index}.${fileExtension}`,
            } as any);
        });

        try {
            const xhr = new XMLHttpRequest();
            // 🔥 CONDITIONAL: Story goes to /upload-story, Video goes to /upload-hls
            const endpoint = uploadMode === 'story' ? '/upload-story' : '/upload-hls';
            const uploadUrl = `${CONFIG.API_URL}${endpoint}`;
            console.log('🚀 [UPLOAD] Target URL:', uploadUrl);
            xhr.open('POST', uploadUrl);

            // 🔥 SIMPLE: Linear progress from 0 to 95, then 100 on success
            let currentProgress = 0;
            const progressInterval = setInterval(() => {
                if (currentProgress < 95) {
                    currentProgress += 1;
                    setProgress(currentProgress);

                    // Update status based on progress
                    if (currentProgress < 30) setStatus('compressing');
                    else if (currentProgress < 80) setStatus('uploading');
                    else setStatus('processing');
                }
            }, 200); // ~20 seconds to reach 95%

            xhr.onload = () => {
                clearInterval(progressInterval);

                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    console.log('Upload success:', response);

                    // 🔥 Quick animation to 100% before closing
                    let finalProgress = currentProgress;
                    const finishInterval = setInterval(() => {
                        finalProgress += 5;
                        if (finalProgress >= 100) {
                            setProgress(100);
                            clearInterval(finishInterval);
                            // Give user a moment to see 100%
                            setTimeout(() => {
                                // 🔥 For stories, don't pass ID (avoids video fetch error in feed)
                                // For videos, pass ID so feed can prepend the new video
                                setSuccess(uploadMode === 'story' ? '' : (response.data?.id || 'new-video'));

                                if (uploadMode === 'story') {
                                    triggerStoryRefresh(); // 🔥 REFRESH STORIES
                                }

                                // Reset form
                                setSelectedAssets([]);
                                setDescription('');
                                setCommercialType(null);
                                setBrandName('');
                                setBrandUrl('');
                                setSelectedClubs([]);
                                setTags([]);
                            }, 300);
                        } else {
                            setProgress(finalProgress);
                        }
                    }, 30);

                } else {
                    console.error('Upload failed:', xhr.responseText);
                    setError('Yükleme başarısız oldu.');
                    setStatus('error');
                }
            };

            xhr.onerror = (e) => {
                clearInterval(progressInterval);
                console.error('❌ [UPLOAD] Network Error Details:', e);
                console.error('❌ [UPLOAD] XHR Status:', xhr.status);
                setError('Ağ hatası oluştu. Sunucuya ulaşılamıyor.');
                setStatus('error');
            };

            xhr.send(formData);

        } catch (error) {
            console.error('Upload exception:', error);
            setError('Beklenmedik bir hata oluştu.');
            setStatus('error');
        }
    };

    return (
        <>
            <Modal
                animationType="slide"
                transparent={false}
                visible={isVisible}
                onRequestClose={onClose}
                statusBarTranslucent
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={[styles.container, { backgroundColor: bgColor }]}
                >
                    {/* Header */}
                    <View style={[styles.header, { backgroundColor: bgColor, paddingTop: insets.top }]}>
                        <View style={styles.headerLeft}>
                            <Pressable onPress={onClose} style={styles.backButton}>
                                <ChevronLeft color={textColor} size={28} strokeWidth={2} />
                            </Pressable>
                        </View>
                        <View style={styles.headerCenter}>
                            <Text style={[styles.headerTitle, { color: textColor }]}>
                                {uploadMode === 'story' ? 'Yeni Hikaye' : 'Yeni Gönderi'}
                            </Text>
                        </View>
                        <View style={styles.headerRight} />
                    </View>

                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                        {/* Multi-Media Preview */}
                        {selectedAssets.length > 0 && (
                            <View style={styles.previewSection}>
                                <FlatList
                                    horizontal
                                    data={selectedAssets}
                                    keyExtractor={(_, index) => `preview-${index}`}
                                    showsHorizontalScrollIndicator={false}
                                    decelerationRate="fast"
                                    snapToOffsets={selectedAssets.map((_, index) => index * PREVIEW_SNAP_INTERVAL)}
                                    snapToAlignment="start"
                                    bounces={false}
                                    style={styles.previewScroll}
                                    contentContainerStyle={styles.previewScrollContent}
                                    renderItem={({ item, index }) => (
                                        <View style={styles.previewContainer}>
                                            <View style={styles.previewIndexBadge} pointerEvents="none">
                                                <Text style={styles.previewIndexText}>
                                                    {index + 1}/{selectedAssets.length}
                                                </Text>
                                            </View>
                                            {item.type === 'video' ? (
                                                <Video
                                                    source={{ uri: item.uri }}
                                                    style={styles.previewImage}
                                                    resizeMode={ResizeMode.COVER}
                                                    shouldPlay={false}
                                                    isLooping={false}
                                                    isMuted={true}
                                                    useNativeControls={false}
                                                />
                                            ) : (
                                                <Image
                                                    source={{ uri: item.uri }}
                                                    style={styles.previewImage}
                                                    resizeMode="cover"
                                                />
                                            )}
                                        </View>
                                    )}
                                />
                            </View>
                        )}

                        {/* Description Input */}
                        <View style={[styles.descriptionSection, { backgroundColor: inputBg }]}>
                            <TextInput
                                style={[styles.descriptionInput, { color: textColor }]}
                                placeholder="Bir açıklama yaz ve konu etiketleri ekle..."
                                placeholderTextColor={subtextColor}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                maxLength={2200}
                            />
                        </View>

                        {/* Topic Tags */}
                        <View style={styles.section}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll}>
                                {tags.map((tag, index) => (
                                    <View key={index} style={[styles.tagChip, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)', borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.1)' }]}>
                                        <Text style={[styles.tagHashIcon, { color: textColor }]}>#</Text>
                                        <Text style={[styles.tagText, { color: textColor }]}>{tag}</Text>
                                        <Pressable onPress={() => handleRemoveTag(index)} hitSlop={8}>
                                            <X size={14} color={subtextColor} />
                                        </Pressable>
                                    </View>
                                ))}
                                {tags.length < 5 && (
                                    <Pressable onPress={handleAddTag} style={[styles.addTagButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)', borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.1)' }]}>
                                        <Text style={[styles.tagHashIcon, { color: textColor }]}>#</Text>
                                        <PlusCircle size={16} color={isDark ? '#007AFF' : '#007AFF'} />
                                    </Pressable>
                                )}
                            </ScrollView>
                        </View>

                        {/* Menu Items */}
                        <View style={styles.menuSection}>
                            {/* CLUB's ekle */}
                            <Pressable style={[styles.menuItem, { borderBottomColor: borderColor }]} onPress={handleClubsSelect}>
                                <View style={styles.menuItemLeft}>
                                    <Users color={textColor} size={24} />
                                    <Text style={[styles.menuItemText, { color: textColor }]}>CLUB's ekle</Text>
                                </View>
                                <ChevronRight color={subtextColor} size={20} />
                            </Pressable>

                            {/* Ticari İlişki Ekle (Zorunlu) */}
                            <Pressable style={[styles.menuItem, { borderBottomColor: borderColor }]} onPress={handleCommercialTypeSelect}>
                                <View style={styles.menuItemLeft}>
                                    <Tag color={textColor} size={24} />
                                    <Text style={[styles.menuItemText, { color: textColor }]}>
                                        Ticari İlişki Ekle
                                        <Text style={styles.requiredStar}> *</Text>
                                    </Text>
                                </View>
                                <View style={styles.menuItemRight}>
                                    {commercialType ? (
                                        <Text style={[styles.selectedValueText, { color: subtextColor }]} numberOfLines={1}>
                                            {commercialType}
                                        </Text>
                                    ) : null}
                                    <ChevronRight color={subtextColor} size={20} />
                                </View>
                            </Pressable>

                            {/* Yapay zeka etiketi ekle */}
                            <View style={[styles.menuItem, { borderBottomColor: 'transparent' }]}>
                                <View style={styles.menuItemLeft}>
                                    <Text style={styles.aiIcon}>🤖</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.menuItemText, { color: textColor }]}>Yapay zeka etiketi ekle</Text>
                                        <Text style={[styles.aiDescription, { color: subtextColor }]}>
                                            Yapay zekayla oluşturulan belirli gerçekçi içerikleri etiketlemeni zorunlu tutuyoruz. Daha fazla bilgi al
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

                    {/* Bottom Buttons */}
                    <View style={[styles.bottomButtons, { backgroundColor: bgColor, borderTopColor: borderColor, paddingBottom: insets.bottom + 12 }]}>
                        <Pressable
                            style={[styles.draftButton, { backgroundColor: isDark ? '#2C2C2E' : '#F0F0F0' }]}
                            onPress={handleSaveDraft}
                        >
                            <Text style={[styles.draftButtonText, { color: textColor }]}>Taslağı Kaydet</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.shareButton, !commercialType && styles.shareButtonDisabled]}
                            onPress={handleShare}
                            disabled={!commercialType}
                        >
                            <Text style={styles.shareButtonText}>Paylaş</Text>
                        </Pressable>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Commercial Type Selection Modal */}
            <Modal
                visible={showCommercialMenu}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowCommercialMenu(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowCommercialMenu(false)}
                >
                    <View style={[styles.menuModal, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                        <View style={styles.menuHeader}>
                            <Text style={[styles.menuTitle, { color: textColor }]}>Ticari İlişki Türü Seçin</Text>
                        </View>
                        <ScrollView style={styles.menuList}>
                            {COMMERCIAL_TYPES.map((type, index) => (
                                <Pressable
                                    key={type}
                                    style={[
                                        styles.menuOptionItem,
                                        { borderBottomColor: borderColor },
                                        index === COMMERCIAL_TYPES.length - 1 && { borderBottomWidth: 0 }
                                    ]}
                                    onPress={() => selectCommercialType(type)}
                                >
                                    <Text style={[
                                        styles.menuOptionText,
                                        { color: textColor },
                                        commercialType === type && styles.menuOptionTextSelected
                                    ]}>
                                        {type}
                                    </Text>
                                    {commercialType === type && (
                                        <Text style={styles.checkmark}>✓</Text>
                                    )}
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            {/* Brand Info Modal */}
            <Modal
                visible={showBrandInfoModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowBrandInfoModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowBrandInfoModal(false)}
                >
                    <View style={[styles.menuModal, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                        <View style={styles.menuHeader}>
                            <Text style={[styles.menuTitle, { color: textColor }]}>{commercialType}</Text>
                        </View>

                        <View style={styles.brandFormSection}>
                            <Text style={[styles.brandFormLabel, { color: textColor }]}>Marka Adı</Text>
                            <TextInput
                                style={[styles.brandFormInput, { backgroundColor: inputBg, color: textColor, borderColor: borderColor }]}
                                placeholder="Marka adını giriniz"
                                placeholderTextColor={subtextColor}
                                value={brandName}
                                onChangeText={setBrandName}
                            />

                            <Text style={[styles.brandFormLabel, { color: textColor, marginTop: 16 }]}>Marka URL'si</Text>
                            <TextInput
                                style={[styles.brandFormInput, { backgroundColor: inputBg, color: textColor, borderColor: borderColor }]}
                                placeholder="https://marka.com (opsiyonel)"
                                placeholderTextColor={subtextColor}
                                value={brandUrl}
                                onChangeText={setBrandUrl}
                                keyboardType="url"
                                autoCapitalize="none"
                            />

                            <Pressable
                                style={[styles.brandSaveButton, { backgroundColor: '#3A8DFF' }]}
                                onPress={() => setShowBrandInfoModal(false)}
                            >
                                <Text style={styles.brandSaveButtonText}>Kaydet</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Modal>

            {/* Tag Input Modal */}
            <Modal
                visible={showTagInputModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowTagInputModal(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowTagInputModal(false)}
                >
                    <View style={[styles.menuModal, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                        <View style={styles.menuHeader}>
                            <Text style={[styles.menuTitle, { color: textColor }]}>Konu Etiketi Ekle</Text>
                        </View>

                        <View style={styles.brandFormSection}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={[styles.brandFormLabel, { color: textColor, fontSize: 18 }]}>#</Text>
                                <TextInput
                                    style={[styles.brandFormInput, { flex: 1, backgroundColor: inputBg, color: textColor, borderColor: borderColor }]}
                                    placeholder="etiket giriniz"
                                    placeholderTextColor={subtextColor}
                                    value={currentTagInput}
                                    onChangeText={setCurrentTagInput}
                                    autoFocus
                                    maxLength={30}
                                />
                            </View>

                            <Text style={[styles.tagHintText, { color: subtextColor }]}>
                                En fazla 5 etiket ekleyebilirsiniz ({tags.length}/5)
                            </Text>

                            <Pressable
                                style={[styles.brandSaveButton, { backgroundColor: '#3A8DFF' }]}
                                onPress={handleSaveTag}
                            >
                                <Text style={styles.brandSaveButtonText}>Ekle</Text>
                            </Pressable>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    previewScroll: {
        width: SCREEN_WIDTH,
        flexGrow: 0,
    },
    previewScrollContent: {
        paddingHorizontal: PREVIEW_SIDE_PADDING,
        alignItems: 'center',
    },
    carouselIndicator: {
        marginTop: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    carouselIndicatorText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 60,
    },
    headerLeft: {
        width: 44,
        alignItems: 'flex-start',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: {
        width: 44,
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    previewSection: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    previewContainer: {
        width: PREVIEW_ITEM_WIDTH,
        aspectRatio: 9 / 16,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#2C2C2E',
        marginHorizontal: PREVIEW_ITEM_SPACING / 2,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    previewIndexBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        zIndex: 2,
    },
    previewIndexText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    coverEditButton: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    coverEditText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    descriptionSection: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        padding: 12,
    },
    descriptionInput: {
        fontSize: 15,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    tagsScroll: {
        flexGrow: 0,
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
        marginRight: 8,
    },
    tagHashIcon: {
        fontSize: 14,
        fontWeight: '600',
    },
    tagText: {
        fontSize: 13,
        fontWeight: '500',
    },
    addTagButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    tagHintText: {
        fontSize: 12,
        marginTop: 8,
        marginBottom: 16,
    },
    menuSection: {
        paddingHorizontal: 16,
        marginTop: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    menuItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        maxWidth: 150,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '400',
    },
    requiredStar: {
        color: '#FF3B30',
        fontSize: 16,
        fontWeight: 'bold',
    },
    selectedValueText: {
        fontSize: 14,
        maxWidth: 120,
    },
    aiIcon: {
        fontSize: 24,
    },
    aiDescription: {
        fontSize: 12,
        marginTop: 4,
        lineHeight: 16,
    },
    brandFormSection: {
        padding: 20,
    },
    brandFormLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    brandFormInput: {
        fontSize: 15,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    brandSaveButton: {
        marginTop: 20,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandSaveButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    bottomButtons: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 12,
        borderTopWidth: 1,
    },
    draftButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    draftButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    shareButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3A8DFF',
    },
    shareButtonDisabled: {
        backgroundColor: '#A0A0A0',
        opacity: 0.5,
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    menuModal: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 16,
        maxHeight: '70%',
        overflow: 'hidden',
    },
    menuHeader: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    menuList: {
        maxHeight: 400,
    },
    menuOptionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
    },
    menuOptionText: {
        fontSize: 16,
        flex: 1,
    },
    menuOptionTextSelected: {
        fontWeight: '600',
        color: '#3A8DFF',
    },
    checkmark: {
        fontSize: 20,
        color: '#3A8DFF',
        marginLeft: 8,
    },
});
