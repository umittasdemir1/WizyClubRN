import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUploadStore } from '../src/presentation/store/useUploadStore';
import { X, Video as VideoIcon, UploadCloud, CheckCircle2, Circle, ArrowLeft } from 'lucide-react-native';
import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../src/core/constants';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function UploadScreen() {
    const insets = useSafeAreaInsets();
    const { isDark } = useThemeStore();
    const [selectedVideo, setSelectedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [description, setDescription] = useState('');

    // Commercial Logic
    const [commercialType, setCommercialType] = useState(COMMERCIAL_TYPES[0]);
    const [brandName, setBrandName] = useState('');
    const [brandUrl, setBrandUrl] = useState('');
    const [isNoUrl, setIsNoUrl] = useState(false);

    const [userId, setUserId] = useState('687c8079-e94c-42c2-9442-8a4a6b63dec6');

    const { startUpload, setProgress, setStatus, setSuccess, setError } = useUploadStore();

    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const bgColor = themeColors.background;
    const textColor = themeColors.textPrimary;

    const isCommercial = commercialType !== 'İş Birliği İçermiyor';

    const pickVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setSelectedVideo(result.assets[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedVideo) {
            Alert.alert('Video Seçilmedi', 'Lütfen yüklemek için bir video seçin.');
            return;
        }

        // Validate Commercial Fields
        if (isCommercial) {
            if (!brandName.trim()) {
                Alert.alert('Eksik Bilgi', 'Lütfen marka adını girin.');
                return;
            }
            if (!isNoUrl && !brandUrl.trim()) {
                Alert.alert('Eksik Bilgi', 'Lütfen ürün linkini girin veya belirtmek istemiyorsanız kutucuğu işaretleyin.');
                return;
            }
        }

        router.back();
        startUpload();

        const formData = new FormData();
        formData.append('userId', userId);
        formData.append('description', description);
        formData.append('commercialType', commercialType);

        if (isCommercial) {
            formData.append('brandName', brandName);
            if (!isNoUrl) {
                formData.append('brandUrl', brandUrl);
            }
        }

        formData.append('video', {
            uri: selectedVideo.uri,
            type: 'video/mp4',
            name: 'upload.mp4',
        } as any);

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'http://192.168.0.138:3000/upload-hls');

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
                    setSelectedVideo(null);
                    setDescription('');
                    setBrandName('');
                    setBrandUrl('');
                    setCommercialType(COMMERCIAL_TYPES[0]);
                    setIsNoUrl(false);
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
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: bgColor }]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft color={textColor} size={24} />
                </Pressable>
                <Text style={[styles.title, { color: textColor }]}>Yeni Video Yükle</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
                >
                    {/* Video Select */}
                    <Pressable onPress={pickVideo} style={[styles.videoSelect, { backgroundColor: isDark ? '#262626' : '#F3F4F6', borderColor: isDark ? '#333333' : '#E5E7EB' }]}>
                        {selectedVideo ? (
                            <View style={styles.selectedVideoInfo}>
                                <VideoIcon color="#4ADE80" size={32} />
                                <Text style={styles.videoText}>Video Seçildi</Text>
                                <Text style={styles.videoSubText}>{(selectedVideo.fileSize ? (selectedVideo.fileSize / 1024 / 1024).toFixed(1) : '?')} MB</Text>
                            </View>
                        ) : (
                            <View style={styles.placeholder}>
                                <UploadCloud color="#9CA3AF" size={40} />
                                <Text style={styles.placeholderText}>Video Seçmek İçin Dokun</Text>
                            </View>
                        )}
                    </Pressable>

                    {/* Description */}
                    <TextInput
                        style={[styles.input, { backgroundColor: isDark ? '#262626' : '#F3F4F6', color: textColor }]}
                        placeholder="Açıklama yaz..."
                        placeholderTextColor="#9CA3AF"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                    />

                    {/* Commercial Type Selection */}
                    <View>
                        <Text style={[styles.label, { color: textColor }]}>Ticari İlişki Türü</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                            {COMMERCIAL_TYPES.map((type) => (
                                <Pressable
                                    key={type}
                                    onPress={() => setCommercialType(type)}
                                    style={[
                                        styles.chip,
                                        { backgroundColor: isDark ? '#262626' : '#F3F4F6', borderColor: isDark ? '#333333' : '#E5E7EB' },
                                        commercialType === type && styles.activeChip
                                    ]}
                                >
                                    <Text style={[
                                        styles.chipText,
                                        { color: isDark ? '#D1D5DB' : '#6B7280' },
                                        commercialType === type && styles.activeChipText
                                    ]}>
                                        {type}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

                    {isCommercial && (
                        <View style={styles.commercialFields}>
                            <TextInput
                                style={[styles.input, { backgroundColor: isDark ? '#262626' : '#F3F4F6', color: textColor }]}
                                placeholder="Marka Adı (Örn: Nike)"
                                placeholderTextColor="#9CA3AF"
                                value={brandName}
                                onChangeText={setBrandName}
                            />

                            <TextInput
                                style={[
                                    styles.input,
                                    { backgroundColor: isDark ? '#262626' : '#F3F4F6', color: textColor },
                                    isNoUrl && styles.disabledInput
                                ]}
                                placeholder="Ürün Linki (https://...)"
                                placeholderTextColor="#9CA3AF"
                                value={brandUrl}
                                onChangeText={setBrandUrl}
                                autoCapitalize="none"
                                editable={!isNoUrl}
                            />

                            <Pressable
                                style={styles.checkboxRow}
                                onPress={() => setIsNoUrl(!isNoUrl)}
                            >
                                {isNoUrl ? (
                                    <CheckCircle2 color="#FF3B30" size={24} />
                                ) : (
                                    <Circle color="#9CA3AF" size={24} />
                                )}
                                <Text style={styles.checkboxText}>
                                    URL Belirtmek istemiyorum. Gönderimin hangi ticari ilişkiyi belirttiğinden emin değilim.
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Submit Button */}
                    <Pressable
                        style={[
                            styles.uploadButton,
                            !selectedVideo && styles.disabledButton
                        ]}
                        onPress={handleUpload}
                        disabled={!selectedVideo}
                    >
                        <Text style={styles.uploadButtonText}>Yüklemeyi Başlat</Text>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#333',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    content: {
        padding: 20,
        gap: 16,
    },
    videoSelect: {
        height: 120,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholder: {
        alignItems: 'center',
        gap: 8,
    },
    placeholderText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    selectedVideoInfo: {
        alignItems: 'center',
        gap: 4,
    },
    videoText: {
        color: '#4ADE80',
        fontWeight: '600',
    },
    videoSubText: {
        color: '#6B7280',
        fontSize: 12,
    },
    input: {
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
    },
    uploadButton: {
        backgroundColor: '#FF3B30',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginTop: 8,
    },
    disabledButton: {
        backgroundColor: '#262626',
        opacity: 0.5,
    },
    uploadButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    chipsContainer: {
        gap: 8,
        paddingVertical: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    activeChip: {
        backgroundColor: '#FF3B30',
        borderColor: '#FF3B30',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '500',
    },
    activeChipText: {
        color: 'white',
    },
    commercialFields: {
        gap: 12,
    },
    disabledInput: {
        opacity: 0.5,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 4,
    },
    checkboxText: {
        color: '#9CA3AF',
        fontSize: 12,
        flex: 1,
        lineHeight: 16,
    },
});
