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
    StatusBar
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { useUploadStore } from '../../store/useUploadStore';
import { ChevronLeft, ChevronRight, Users, Tag } from 'lucide-react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';
import { CONFIG } from '../../../core/config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UploadModalProps {
    isVisible: boolean;
    onClose: () => void;
    initialVideo?: ImagePicker.ImagePickerAsset | null;
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

export function UploadModal({ isVisible, onClose, initialVideo }: UploadModalProps) {
    const { isDark } = useThemeStore();
    const { user } = useAuthStore();
    const insets = useSafeAreaInsets();
    const [selectedMedia, setSelectedMedia] = useState<ImagePicker.ImagePickerAsset | null>(initialVideo || null);
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
    const [commercialType, setCommercialType] = useState<string | null>(null); // Zorunlu - başlangıçta null
    const [useAILabel, setUseAILabel] = useState(false);

    // Sync with initialVideo when it changes
    useEffect(() => {
        if (initialVideo) {
            setSelectedMedia(initialVideo);
        }
    }, [initialVideo]);

    const { startUpload, setProgress, setStatus, setSuccess, setError } = useUploadStore();

    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const bgColor = isDark ? '#000000' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A0A0A0' : '#6B6B6B';
    const borderColor = isDark ? '#2C2C2E' : '#E5E5E5';
    const inputBg = isDark ? '#1C1C1E' : '#F5F5F5';

    const handleSaveDraft = () => {
        // TODO: Taslak kaydetme işlevi
        Alert.alert('Taslak Kaydedildi', 'Videonuz taslak olarak kaydedildi.');
        onClose();
    };

    const handleCoverEdit = () => {
        // TODO: Kapak düzenleme modal'ı aç
        Alert.alert('Kapak Düzenle', 'Kapak düzenleme özelliği yakında eklenecek.');
    };

    const handleClubsSelect = () => {
        // TODO: CLUB's seçim modal'ı aç
        Alert.alert('CLUB\'s Seç', 'CLUB seçim özelliği yakında eklenecek.');
    };

    const handleCommercialTypeSelect = () => {
        // TODO: Ticari İlişki seçim modal'ı aç
        Alert.alert('Ticari İlişki Türü', 'Lütfen ticari ilişki türünü seçin:\n\n' + COMMERCIAL_TYPES.join('\n'));
    };

    const handleShare = async () => {
        if (!selectedMedia) {
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

        const formData = new FormData();
        formData.append('userId', user.id);
        formData.append('description', description);
        formData.append('commercialType', commercialType);

        // IMPORTANT: File must be appended LAST for Multer to process body fields first!
        const isVideo = selectedMedia.type === 'video';
        const fileExtension = isVideo ? 'mp4' : 'jpg';
        const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';

        formData.append('video', {
            uri: selectedMedia.uri,
            type: mimeType,
            name: `upload.${fileExtension}`,
        } as any);

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${CONFIG.API_URL}/upload-hls`);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progressPercent = (event.loaded / event.total) * 100;
                    setProgress(progressPercent);
                    if (progressPercent === 100) setStatus('processing');
                    else setStatus('uploading');
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    console.log('Upload success:', response);
                    setSuccess(response.data?.id || 'new-video');
                    // Reset
                    setSelectedMedia(null);
                    setDescription('');
                    setCommercialType(null);
                    setSelectedClubs([]);
                    setTags([]);
                } else {
                    console.error('Upload failed:', xhr.responseText);
                    setError('Yükleme başarısız oldu.');
                    setStatus('error');
                }
            };

            xhr.onerror = (e) => {
                console.error('Upload error:', e);
                setError('Ağ hatası oluştu.');
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
        <Modal
            animationType="slide"
            transparent={false}
            visible={isVisible}
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={[styles.container, { backgroundColor: bgColor }]}
            >
                {/* Header */}
                <View style={[styles.header, { backgroundColor: bgColor, borderBottomColor: borderColor, paddingTop: insets.top + 12 }]}>
                    <Pressable onPress={onClose} style={styles.backButton}>
                        <ChevronLeft color={textColor} size={28} />
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: textColor }]}>Yeni Video</Text>
                    <View style={{ width: 28 }} />
                </View>

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    {/* Video/Photo Preview */}
                    {selectedMedia && (
                        <View style={styles.previewSection}>
                            <View style={styles.previewContainer}>
                                {selectedMedia.type === 'video' ? (
                                    <Video
                                        source={{ uri: selectedMedia.uri }}
                                        style={styles.previewImage}
                                        resizeMode="cover"
                                        shouldPlay={false}
                                        isLooping={false}
                                        isMuted={true}
                                        useNativeControls={false}
                                    />
                                ) : (
                                    <Image
                                        source={{ uri: selectedMedia.uri }}
                                        style={styles.previewImage}
                                        resizeMode="cover"
                                    />
                                )}
                                <Pressable style={styles.coverEditButton} onPress={handleCoverEdit}>
                                    <Text style={styles.coverEditText}>Kapağı düzenle</Text>
                                </Pressable>
                            </View>
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
                            <View style={styles.tagChip}>
                                <Text style={styles.tagChipIcon}>#</Text>
                                <Text style={[styles.tagChipText, { color: textColor }]}>Konu etiketleri</Text>
                            </View>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    previewSection: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    previewContainer: {
        width: SCREEN_WIDTH * 0.5,
        aspectRatio: 9 / 16,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#2C2C2E',
    },
    previewImage: {
        width: '100%',
        height: '100%',
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
        backgroundColor: '#2C2C2E',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
    },
    tagChipIcon: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3A8DFF',
    },
    tagChipText: {
        fontSize: 14,
        fontWeight: '500',
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
});
