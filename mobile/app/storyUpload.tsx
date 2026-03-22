import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
} from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { X, Zap, ZapOff, Cog } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogCode, logError, logUI } from '@/core/services/Logger';
import { textShadowStyle } from '@/core/utils/shadow';
import { useGalleryPickerStore } from '../src/presentation/store/useGalleryPickerStore';
import { useUploadComposerStore } from '../src/presentation/store/useUploadComposerStore';
import { CameraFlipButton } from '../src/presentation/components/upload/camera/CameraFlipButton';

/**
 * Story Upload Screen - Dedicated story upload page
 * Opens from avatar press when user has no stories.
 * Always uploads in 'story' mode (no mode selector).
 */
export default function StoryUploadScreen() {
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<any>(null);

    const [facing, setFacing] = useState<CameraType>('front');
    const [flash, setFlash] = useState<FlashMode>('off');
    const [permission, requestPermission] = useCameraPermissions();
    const [lastPhoto, setLastPhoto] = useState<string | null>(null);
    const activeFlash: FlashMode = facing === 'front' ? 'off' : flash;

    // Upload Flow
    const clearPickedAssets = useGalleryPickerStore((state) => state.clearPickedAssets);
    const setDraft = useUploadComposerStore((state) => state.setDraft);

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
                    logError(LogCode.MEDIA_PICKER_ERROR, 'Failed to fetch last photo', error);
                }
            }
        })();
    }, []);

    // Gallery picking navigation is now handled directly within GalleryPicker.tsx
    // to ensure correct navigation stack (Composer -> Back -> Gallery).

    const toggleFlash = () => {
        if (facing === 'front') return;
        setFlash(current => current === 'off' ? 'on' : 'off');
    };

    const toggleCameraFacing = () => {
        setFacing(current => {
            const nextFacing = current === 'back' ? 'front' : 'back';
            if (nextFacing === 'front') {
                setFlash('off');
            }
            return nextFacing;
        });
    };

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

    const openGallery = () => {
        clearPickedAssets();
        router.push({
            pathname: '/galleryPicker',
            params: { createMode: 'story' },
        });
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                logUI(LogCode.CAMERA_CAPTURE, 'Story photo captured', { width: photo.width, height: photo.height });
                const photoAsset: ImagePicker.ImagePickerAsset = {
                    uri: photo.uri,
                    width: photo.width,
                    height: photo.height,
                    assetId: undefined,
                    fileName: undefined,
                    fileSize: undefined,
                    type: 'image',
                    duration: undefined,
                    base64: null,
                    exif: null,
                    mimeType: 'image/jpeg'
                };

                setDraft({
                    selectedAssets: [photoAsset],
                    uploadMode: 'story',
                    coverAssetIndex: 0,
                    playbackRate: 1,
                    videoVolume: 1,
                    cropRatio: '9:16',
                    filterPreset: 'none',
                    qualityPreset: 'medium',
                    subtitleLanguage: 'auto',
                    trimStartSec: 0,
                    trimEndSec: 0,
                });
                router.push('/upload-composer');
            } catch (error) {
                logError(LogCode.CAMERA_ERROR, 'Failed to take picture for story', error);
            }
        }
    };

    return (
        <View style={styles.container}>
            <View style={[styles.statusBarSpacer, { height: insets.top }]} />
            {/* Camera Preview */}
            <View style={styles.cameraContainer}>
                <View style={[styles.cameraInner, { paddingLeft: insets.left, paddingRight: insets.right }]}>
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing={facing}
                        flash={activeFlash}
                    />

                    {/* Top Header */}
                    <View style={[styles.topBar, { paddingTop: 12 }]}>
                        <Pressable onPress={() => router.back()} style={[styles.iconButton, styles.topIconShiftLeft, styles.topBarLeft]}>
                            <X color="#FFFFFF" size={32} strokeWidth={1.8} />
                        </Pressable>

                        <View style={styles.topBarCenter}>
                            {facing === 'back' ? (
                                <Pressable onPress={toggleFlash} style={[styles.iconButton, styles.topIconShift]}>
                                    {flash === 'off' ? (
                                        <ZapOff color="#FFFFFF" size={30} strokeWidth={2} fill="#FFFFFF" />
                                    ) : (
                                        <Zap color="#FFD60A" size={30} strokeWidth={2} fill="#FFD60A" />
                                    )}
                                </Pressable>
                            ) : (
                                <View style={[styles.iconButton, styles.topIconShift]} />
                            )}
                        </View>

                        <Pressable onPress={() => logUI(LogCode.UI_INTERACTION, 'Camera settings button pressed')} style={[styles.iconButton, styles.topIconShiftRight, styles.topBarRight]}>
                            <Cog color="#FFFFFF" size={30} strokeWidth={1.4} fill="none" />
                        </Pressable>
                    </View>
                </View>
            </View>

            {/* Bottom Controls */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 36 }]}>
                {/* Bottom Actions */}
                <View style={[styles.bottomActions, styles.bottomActionsShift]}>
                    {/* Gallery Preview */}
                    <View style={styles.sideSlot}>
                        <Pressable onPress={openGallery} style={styles.galleryButton}>
                            {lastPhoto ? (
                                <Image source={{ uri: lastPhoto }} style={styles.galleryPreview} />
                            ) : (
                                <View style={styles.galleryPlaceholder} />
                            )}
                        </Pressable>
                    </View>

                    {/* Capture Button */}
                    <Pressable onPress={takePicture} style={[styles.captureButtonOuter, styles.captureButtonShift]}>
                        <View style={styles.captureButtonInner} />
                    </Pressable>

                    {/* Flip Camera */}
                    <View style={styles.sideSlot}>
                        <CameraFlipButton
                            facing={facing}
                            onPress={toggleCameraFacing}
                            style={styles.flipButton}
                        />
                    </View>
                </View>

                {/* Mode Label - Fixed to HİKAYE */}
                <View style={[styles.modeLabelContainer, styles.modeSelectorShift]}>
                    <Text style={styles.modeLabelText}>HİKAYE</Text>
                </View>
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
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
        borderRadius: 16,
    },
    cameraInner: {
        flex: 1,
        backgroundColor: '#000',
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
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 12,
        zIndex: 100,
    },
    topBarLeft: {
        position: 'absolute',
        left: 20,
    },
    topBarRight: {
        position: 'absolute',
        right: 20,
    },
    topBarCenter: {
        alignItems: 'center',
    },
    iconButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topIconShift: {
        transform: [{ translateY: -5 }],
    },
    topIconShiftLeft: {
        transform: [{ translateY: -5 }, { translateX: -10 }],
    },
    topIconShiftRight: {
        transform: [{ translateY: -5 }, { translateX: 10 }],
    },
    statusBarSpacer: {
        backgroundColor: '#000',
    },
    bottomBar: {
        backgroundColor: '#000',
        paddingTop: 12,
        alignItems: 'center',
        gap: 12,
        zIndex: 100,
    },
    bottomActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        width: '100%',
        paddingHorizontal: 24,
    },
    bottomActionsShift: {
        transform: [{ translateY: 10 }],
    },
    sideSlot: {
        width: 84,
        alignItems: 'center',
    },
    galleryButton: {
        width: 44,
        height: 44,
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#9E9E9E',
        zIndex: 999,
        transform: [{ translateX: -20 }, { translateY: -15 }],
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
        width: 78,
        height: 78,
        borderRadius: 39,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    captureButtonShift: {
        transform: [{ translateY: -65 }],
    },
    captureButtonInner: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: '#FFFFFF',
    },
    flipButton: {
        width: 44,
        height: 44,
        transform: [{ translateX: 20 }, { translateY: -15 }],
    },
    modeLabelContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 28,
    },
    modeSelectorShift: {
        transform: [{ translateY: 50 }],
    },
    modeLabelText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        ...textShadowStyle('rgba(0, 0, 0, 0.5)', { width: 0, height: 1 }, 2),
    },
});
