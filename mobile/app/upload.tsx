import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
    InteractionManager,
} from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogCode, logError, logUI } from '@/core/services/Logger';
import { useGalleryPickerStore } from '../src/presentation/store/useGalleryPickerStore';
import { useUploadComposerStore } from '../src/presentation/store/useUploadComposerStore';
import { CameraControls } from '../src/presentation/components/upload/camera/CameraControls';
import { ModeSelector, MODES } from '../src/presentation/components/upload/camera/ModeSelector';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_ITEM_WIDTH = SCREEN_WIDTH;
const PREVIEW_ASPECT_RATIO_DEFAULT = 16 / 9;
const PREVIEW_BORDER_RADIUS = 20;

export default function CameraScreen() {
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<any>(null);
    const { storyOnly } = useLocalSearchParams<{ storyOnly?: string | string[] }>();
    const isStoryOnlyEntry = Array.isArray(storyOnly) ? storyOnly[0] === '1' : storyOnly === '1';

    const [facing, setFacing] = useState<CameraType>('front');
    const [flash, setFlash] = useState<FlashMode>('off');
    const [permission, requestPermission] = useCameraPermissions();
    const [selectedMode, setSelectedMode] = useState(MODES[0]);
    const [lastPhoto, setLastPhoto] = useState<string | null>(null);
    const [modeContainerWidth, setModeContainerWidth] = useState(0);

    // Upload Flow
    const clearPickedAssets = useGalleryPickerStore((state) => state.clearPickedAssets);
    const setDraft = useUploadComposerStore((state) => state.setDraft);

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const activeFlash: FlashMode = facing === 'front' ? 'off' : flash;

    // Get last photo from gallery for preview — deferred until transition completes
    useEffect(() => {
        const task = InteractionManager.runAfterInteractions(async () => {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === 'granted') {
                try {
                    const albums = await MediaLibrary.getAssetsAsync({
                        first: 1,
                        sortBy: [[MediaLibrary.SortBy.modificationTime, false]],
                    });
                    if (albums.assets.length > 0) {
                        setLastPhoto(albums.assets[0].uri);
                    }
                } catch (error) {
                    logError(LogCode.MEDIA_PICKER_ERROR, 'Failed to fetch last photo', error);
                }
            }
        });
        return () => task.cancel();
    }, []);

    useEffect(() => {
        if (!isStoryOnlyEntry) return;
        if (selectedMode !== MODES[0]) {
            setSelectedMode(MODES[0]);
        }
    }, [isStoryOnlyEntry, selectedMode]);

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

    const resolveCreateMode = () => {
        if (isStoryOnlyEntry || selectedMode === MODES[0]) return 'story';
        if (selectedMode === MODES[2]) return 'draft';
        return 'post';
    };

    const openGallery = () => {
        clearPickedAssets();
        router.push({
            pathname: '/galleryPicker',
            params: { createMode: resolveCreateMode() },
        });
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                logUI(LogCode.CAMERA_CAPTURE, 'Photo captured', { width: photo.width, height: photo.height });
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
                    uploadMode: isStoryOnlyEntry || selectedMode === MODES[0] ? 'story' : 'video',
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
                logError(LogCode.CAMERA_ERROR, 'Failed to take picture', error);
            }
        }
    };

    const startRecording = async () => {
        if (!cameraRef.current || isRecording) return;

        try {
            setIsRecording(true);
            const video = await cameraRef.current.recordAsync();
            logUI(LogCode.CAMERA_CAPTURE, 'Video recorded', { uri: video.uri });
            const videoAsset: ImagePicker.ImagePickerAsset = {
                uri: video.uri,
                width: 0,
                height: 0,
                assetId: undefined,
                fileName: undefined,
                fileSize: undefined,
                type: 'video',
                duration: undefined,
                base64: null,
                exif: null,
                mimeType: 'video/mp4'
            };
            setDraft({
                selectedAssets: [videoAsset],
                uploadMode: isStoryOnlyEntry ? 'story' : 'video',
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
            logError(LogCode.CAMERA_ERROR, 'Failed to record video', error);
        } finally {
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
        if (!cameraRef.current || !isRecording) return;

        try {
            cameraRef.current.stopRecording();
        } catch (error) {
            logError(LogCode.CAMERA_ERROR, 'Failed to stop recording', error);
            setIsRecording(false);
        }
    };

    const handleTapCapture = () => {
        if (isRecording) return;
        void takePicture();
    };

    return (
        <View style={styles.container}>
            <View style={[styles.statusBarSpacer, { height: insets.top }]} />

            <View style={styles.viewfinderWrapper}>
                <View style={styles.cameraContainer}>
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing={facing}
                        flash={activeFlash}
                    />

                </View>

                {/* Overlays moved outside cameraContainer to allow negative positioning without clipping */}
                <CameraControls
                    isRecording={isRecording}
                    flash={flash}
                    toggleFlash={toggleFlash}
                    facing={facing}
                    toggleCameraFacing={toggleCameraFacing}
                    onTapCapture={handleTapCapture}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
                    openGallery={openGallery}
                    lastPhoto={lastPhoto}
                    allowLongPressRecord={!isStoryOnlyEntry}
                />

                {isStoryOnlyEntry ? (
                    <View style={styles.storyOnlyModeLabelContainer}>
                        <Text style={styles.storyOnlyModeLabel}>{MODES[0]}</Text>
                    </View>
                ) : (
                    <ModeSelector
                        selectedMode={selectedMode}
                        setSelectedMode={setSelectedMode}
                        modeContainerWidth={modeContainerWidth}
                        setModeContainerWidth={setModeContainerWidth}
                    />
                )}
            </View>

            <View style={styles.bottomBar} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    viewfinderWrapper: {
        width: PREVIEW_ITEM_WIDTH,
        height: PREVIEW_ITEM_WIDTH * PREVIEW_ASPECT_RATIO_DEFAULT + 120, // Expanded to include the scroll/touch area for ModeSelector
        alignSelf: 'center',
        zIndex: 5,
    },
    cameraContainer: {
        width: PREVIEW_ITEM_WIDTH,
        height: PREVIEW_ITEM_WIDTH * PREVIEW_ASPECT_RATIO_DEFAULT,
        borderRadius: PREVIEW_BORDER_RADIUS,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        alignSelf: 'center',
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
    statusBarSpacer: {
        backgroundColor: '#000',
    },
    bottomBar: {
        flex: 1,
        backgroundColor: '#000',
        width: '100%',
    },
    storyOnlyModeLabelContainer: {
        position: 'absolute',
        left: 90,
        right: 90,
        bottom: 42,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    storyOnlyModeLabel: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
