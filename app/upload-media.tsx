import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    FlatList,
    Dimensions,
    Image,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { Camera, CameraType } from 'expo-camera';
import { X, HelpCircle, FlipHorizontal } from 'lucide-react-native';
import { StatusBar } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAMERA_HEIGHT = SCREEN_HEIGHT * 0.5;
const ITEM_SIZE = SCREEN_WIDTH / 3 - 4;

interface MediaItem {
    id: string;
    uri: string;
    mediaType: 'photo' | 'video';
    duration?: number;
}

export default function UploadMediaScreen() {
    const router = useRouter();

    // States
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [cameraType, setCameraType] = useState<CameraType>(CameraType.front);
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Request permissions
    useEffect(() => {
        (async () => {
            const cameraStatus = await Camera.requestCameraPermissionsAsync();
            const mediaStatus = await MediaLibrary.requestPermissionsAsync();
            setHasPermission(cameraStatus.status === 'granted' && mediaStatus.status === 'granted');

            if (mediaStatus.status === 'granted') {
                loadMedia();
            }
        })();
    }, []);

    // Load media from gallery
    const loadMedia = async () => {
        try {
            setIsLoading(true);
            const result = await MediaLibrary.getAssetsAsync({
                first: 50,
                mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video],
                sortBy: MediaLibrary.SortBy.creationTime,
            });

            const items: MediaItem[] = result.assets.map((asset) => ({
                id: asset.id,
                uri: asset.uri,
                mediaType: asset.mediaType === MediaLibrary.MediaType.video ? 'video' : 'photo',
                duration: asset.duration,
            }));

            setMedia(items);
        } catch (error) {
            console.error('Error loading media:', error);
            Alert.alert('Hata', 'Galeri yüklenirken bir hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle item selection
    const toggleSelect = (id: string) => {
        setSelectedItems((prev) => {
            if (prev.includes(id)) {
                return prev.filter((item) => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    // Get selection order number
    const getSelectionNumber = (id: string) => {
        const index = selectedItems.indexOf(id);
        return index >= 0 ? index + 1 : null;
    };

    // Flip camera
    const handleFlipCamera = () => {
        setCameraType((prev) =>
            prev === CameraType.front ? CameraType.back : CameraType.front
        );
    };

    // Navigate to create screen
    const handleNext = () => {
        if (selectedItems.length === 0) return;

        const selectedMedia = media.filter((item) => selectedItems.includes(item.id));
        router.push({
            pathname: '/create-post',
            params: { mediaIds: JSON.stringify(selectedItems) },
        });
    };

    // Close screen
    const handleClose = () => {
        router.back();
    };

    if (hasPermission === null) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#e60023" />
            </View>
        );
    }

    if (hasPermission === false) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Kamera ve galeri izni gerekli</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={handleClose} style={styles.iconButton}>
                        <X size={24} color="#fff" />
                    </Pressable>
                    <Pressable style={styles.iconButton}>
                        <HelpCircle size={24} color="#fff" />
                    </Pressable>
                </View>

                <Pressable
                    onPress={handleNext}
                    style={[styles.nextButton, selectedItems.length === 0 && styles.nextButtonDisabled]}
                    disabled={selectedItems.length === 0}
                >
                    <Text style={styles.nextButtonText}>İleri</Text>
                </Pressable>
            </View>

            {/* Camera Preview */}
            <View style={styles.cameraContainer}>
                <Camera
                    style={styles.camera}
                    type={cameraType}
                />
                <Pressable onPress={handleFlipCamera} style={styles.flipButton}>
                    <FlipHorizontal size={24} color="#fff" />
                </Pressable>
            </View>

            {/* Gallery Section */}
            <View style={styles.gallerySection}>
                <View style={styles.galleryHeader}>
                    <Text style={styles.albumText}>Yakınlardakiler</Text>
                    <View style={styles.multiSelectBadge}>
                        <Text style={styles.multiSelectText}>Birden Fazla Seç</Text>
                    </View>
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#e60023" />
                    </View>
                ) : (
                    <FlatList
                        data={media}
                        keyExtractor={(item) => item.id}
                        numColumns={3}
                        renderItem={({ item }) => {
                            const isSelected = selectedItems.includes(item.id);
                            const selectionNumber = getSelectionNumber(item.id);

                            return (
                                <Pressable
                                    onPress={() => toggleSelect(item.id)}
                                    style={[styles.mediaItem, isSelected && styles.mediaItemSelected]}
                                >
                                    <Image source={{ uri: item.uri }} style={styles.mediaImage} />

                                    {/* Video Duration */}
                                    {item.mediaType === 'video' && item.duration && (
                                        <View style={styles.durationBadge}>
                                            <Text style={styles.durationText}>
                                                {Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, '0')}
                                            </Text>
                                        </View>
                                    )}

                                    {/* Selection Number */}
                                    {isSelected && selectionNumber && (
                                        <View style={styles.selectionNumber}>
                                            <Text style={styles.selectionNumberText}>{selectionNumber}</Text>
                                        </View>
                                    )}
                                </Pressable>
                            );
                        }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.galleryContent}
                    />
                )}
            </View>

            {/* Selected Count Indicator */}
            {selectedItems.length > 0 && (
                <View style={styles.selectedCountContainer}>
                    <View style={styles.selectedCountBadge}>
                        <Text style={styles.selectedCountText}>{selectedItems.length} seçildi</Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    errorText: {
        color: '#fff',
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
    },
    headerLeft: {
        flexDirection: 'row',
        gap: 16,
    },
    iconButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: '#e60023',
        borderRadius: 24,
    },
    nextButtonDisabled: {
        backgroundColor: '#555',
        opacity: 0.5,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    cameraContainer: {
        height: CAMERA_HEIGHT,
        backgroundColor: '#1a1a1a',
        position: 'relative',
    },
    camera: {
        flex: 1,
    },
    flipButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gallerySection: {
        flex: 1,
        backgroundColor: '#000',
    },
    galleryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    albumText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    multiSelectBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 16,
    },
    multiSelectText: {
        color: '#fff',
        fontSize: 13,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    galleryContent: {
        padding: 2,
    },
    mediaItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        margin: 1,
        position: 'relative',
    },
    mediaItemSelected: {
        borderWidth: 3,
        borderColor: '#e60023',
    },
    mediaImage: {
        width: '100%',
        height: '100%',
    },
    durationBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    durationText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    selectionNumber: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#e60023',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectionNumberText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    selectedCountContainer: {
        position: 'absolute',
        bottom: SCREEN_HEIGHT * 0.4,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    selectedCountBadge: {
        backgroundColor: '#e60023',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: '#e60023',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    selectedCountText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
