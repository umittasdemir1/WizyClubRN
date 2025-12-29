import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    Dimensions,
} from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { X, Zap, ZapOff, Settings, RotateCw } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MODES = ['HİKAYE', 'VİDEO'];

export default function CameraScreen() {
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<any>(null);

    const [facing, setFacing] = useState<CameraType>('back');
    const [flash, setFlash] = useState<FlashMode>('off');
    const [permission, requestPermission] = useCameraPermissions();
    const [selectedMode, setSelectedMode] = useState('HİKAYE');
    const [lastPhoto, setLastPhoto] = useState<string | null>(null);

    // Get last photo from gallery for preview
    useEffect(() => {
        (async () => {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === 'granted') {
                try {
                    const albums = await MediaLibrary.getAssetsAsync({
                        first: 1,
                        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
                    });
                    if (albums.assets.length > 0) {
                        setLastPhoto(albums.assets[0].uri);
                    }
                } catch (error) {
                    console.error('Error fetching last photo:', error);
                }
            }
        })();
    }, []);

    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={[styles.container, styles.permissionContainer]}>
                <Text style={styles.permissionText}>Kamera erişimi gerekli</Text>
                <Pressable onPress={requestPermission} style={styles.permissionButton}>
                    <Text style={styles.permissionButtonText}>İzin Ver</Text>
                </Pressable>
            </View>
        );
    }

    const toggleFlash = () => {
        setFlash(current => current === 'off' ? 'on' : 'off');
    };

    const toggleCameraFacing = () => {
        setFacing(current => current === 'back' ? 'front' : 'back');
    };

    const openGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            // Handle selected media
            console.log('Selected media:', result.assets[0]);
        }
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                console.log('Photo taken:', photo.uri);
                // Handle captured photo
            } catch (error) {
                console.error('Error taking picture:', error);
            }
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.cameraContainer}>
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing={facing}
                    flash={flash}
                >
                    {/* Top Header - Overlay */}
                    <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
                        <Pressable onPress={() => router.back()} style={styles.iconButton}>
                            <X color="#FFFFFF" size={28} strokeWidth={2.5} />
                        </Pressable>

                        <Pressable onPress={toggleFlash} style={styles.iconButton}>
                            {flash === 'off' ? (
                                <ZapOff color="#FFFFFF" size={26} strokeWidth={2} />
                            ) : (
                                <Zap color="#FFD60A" size={26} strokeWidth={2} fill="#FFD60A" />
                            )}
                        </Pressable>

                        <Pressable onPress={() => console.log('Settings')} style={styles.iconButton}>
                            <Settings color="#FFFFFF" size={26} strokeWidth={2} />
                        </Pressable>
                    </View>

                    {/* Bottom Controls - Overlay */}
                    <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
                        {/* Bottom Actions */}
                        <View style={styles.bottomActions}>
                            {/* Gallery Preview */}
                            <Pressable onPress={openGallery} style={styles.galleryButton}>
                                {lastPhoto ? (
                                    <Image source={{ uri: lastPhoto }} style={styles.galleryPreview} />
                                ) : (
                                    <View style={styles.galleryPlaceholder} />
                                )}
                            </Pressable>

                            {/* Capture Button */}
                            <Pressable onPress={takePicture} style={styles.captureButtonOuter}>
                                <View style={styles.captureButtonInner} />
                            </Pressable>

                            {/* Flip Camera */}
                            <Pressable onPress={toggleCameraFacing} style={styles.flipButton}>
                                <RotateCw color="#FFFFFF" size={32} strokeWidth={2.5} />
                            </Pressable>
                        </View>

                        {/* Mode Selector - Below Actions */}
                        <View style={styles.modeSelector}>
                            {MODES.map((mode) => (
                                <Pressable
                                    key={mode}
                                    onPress={() => setSelectedMode(mode)}
                                    style={styles.modeButton}
                                >
                                    <Text
                                        style={[
                                            styles.modeText,
                                            selectedMode === mode && styles.modeTextActive
                                        ]}
                                    >
                                        {mode}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </CameraView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    cameraContainer: {
        flex: 1,
        marginHorizontal: 0,
        marginTop: 12,
        marginBottom: 100,
        borderRadius: 28,
        overflow: 'hidden',
    },
    camera: {
        flex: 1,
    },
    permissionContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    permissionText: {
        color: '#FFF',
        fontSize: 16,
        textAlign: 'center',
    },
    permissionButton: {
        backgroundColor: '#FF3B30',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    permissionButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    topBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 12,
        zIndex: 100,
    },
    iconButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        gap: 12,
        zIndex: 100,
    },
    modeSelector: {
        flexDirection: 'row',
        gap: 24,
        marginTop: 8,
    },
    modeButton: {
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    modeText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
        fontWeight: '500',
    },
    modeTextActive: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    bottomActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 24,
    },
    galleryButton: {
        width: 44,
        height: 44,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.6)',
    },
    galleryPreview: {
        width: '100%',
        height: '100%',
    },
    galleryPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    captureButtonOuter: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    captureButtonInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
    },
    flipButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
