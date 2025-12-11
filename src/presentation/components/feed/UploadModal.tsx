import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Switch
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useUploadStore } from '../../store/useUploadStore';
import { X, Video as VideoIcon, UploadCloud } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

interface UploadModalProps {
    isVisible: boolean;
    onClose: () => void;
}

import { ScrollView, TouchableOpacity } from 'react-native';
import { Check, CheckCircle2, Circle } from 'lucide-react-native';

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

export function UploadModal({ isVisible, onClose }: UploadModalProps) {
    const [selectedVideo, setSelectedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [description, setDescription] = useState('');

    // Commercial Logic
    const [commercialType, setCommercialType] = useState(COMMERCIAL_TYPES[0]); // Default: İş Birliği İçermiyor
    const [brandName, setBrandName] = useState('');
    const [brandUrl, setBrandUrl] = useState('');
    const [isNoUrl, setIsNoUrl] = useState(false);

    const [userId, setUserId] = useState('user_' + Math.floor(Math.random() * 1000));

    const { startUpload, setProgress, setStatus, setSuccess, setError } = useUploadStore();

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

        onClose();
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

        // IMPORTANT: File must be appended LAST for Multer to process body fields first!
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
                    setSuccess(response.videoId || 'new-video');
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
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <BlurView intensity={20} style={styles.blurContainer}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                >
                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>Yeni Video Yükle</Text>
                            <Pressable onPress={onClose} style={styles.closeButton}>
                                <X color="#FFF" size={24} />
                            </Pressable>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                            {/* Video Select */}
                            <Pressable onPress={pickVideo} style={styles.videoSelect}>
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
                                style={styles.input}
                                placeholder="Açıklama yaz..."
                                placeholderTextColor="#9CA3AF"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />

                            {/* Commercial Type Selection */}
                            <View>
                                <Text style={styles.label}>Ticari İlişki Türü</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                                    {COMMERCIAL_TYPES.map((type) => (
                                        <Pressable
                                            key={type}
                                            onPress={() => setCommercialType(type)}
                                            style={[
                                                styles.chip,
                                                commercialType === type && styles.activeChip
                                            ]}
                                        >
                                            <Text style={[
                                                styles.chipText,
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
                                        style={styles.input}
                                        placeholder="Marka Adı (Örn: Nike)"
                                        placeholderTextColor="#9CA3AF"
                                        value={brandName}
                                        onChangeText={setBrandName}
                                    />

                                    {/* URL Input */}
                                    <TextInput
                                        style={[styles.input, isNoUrl && styles.disabledInput]}
                                        placeholder="Ürün Linki (https://...)"
                                        placeholderTextColor="#9CA3AF"
                                        value={brandUrl}
                                        onChangeText={setBrandUrl}
                                        autoCapitalize="none"
                                        editable={!isNoUrl}
                                    />

                                    {/* No URL Checkbox */}
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
                    </View>
                </KeyboardAvoidingView>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    blurContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    content: {
        backgroundColor: '#111827',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        gap: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    videoSelect: {
        height: 120,
        backgroundColor: '#1F2937',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#374151',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
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
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 16,
        color: 'white',
        fontSize: 16,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    label: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    uploadButton: {
        backgroundColor: '#FF3B30',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginTop: 8,
    },
    disabledButton: {
        backgroundColor: '#374151',
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
        backgroundColor: '#374151',
        borderWidth: 1,
        borderColor: '#4B5563',
    },
    activeChip: {
        backgroundColor: '#FF3B30',
        borderColor: '#FF3B30',
    },
    chipText: {
        color: '#D1D5DB',
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
        backgroundColor: '#111827',
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
