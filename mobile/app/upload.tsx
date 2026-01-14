import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Image,
    Dimensions,
    ScrollView,
} from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Zap, ZapOff, Cog, RefreshCcw } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UploadModal } from '../src/presentation/components/feed/UploadModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MODES = ['HİKAYE', 'GÖNDERİ', 'TASLAK'];

export default function CameraScreen() {
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<any>(null);
    const modeScrollRef = useRef<ScrollView>(null);

    const [facing, setFacing] = useState<CameraType>('back');
    const [flash, setFlash] = useState<FlashMode>('off');
    const [permission, requestPermission] = useCameraPermissions();
    const [selectedMode, setSelectedMode] = useState('HİKAYE');
    const [lastPhoto, setLastPhoto] = useState<string | null>(null);
    const [modeContainerWidth, setModeContainerWidth] = useState(0);
    const [modeLayouts, setModeLayouts] = useState<Record<string, { x: number; width: number }>>({});
    const [modeOffsets, setModeOffsets] = useState<number[]>([]);

    // Upload Modal state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedAssetsForUpload, setSelectedAssetsForUpload] = useState<ImagePicker.ImagePickerAsset[]>([]);

    // Recording state
    const [isRecording, setIsRecording] = useState(false);

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

    const toggleFlash = () => {
        setFlash(current => current === 'off' ? 'on' : 'off');
    };

    const toggleCameraFacing = () => {
        setFacing(current => current === 'back' ? 'front' : 'back');
    };

    useEffect(() => {
        const layoutCount = Object.keys(modeLayouts).length;
        if (!modeContainerWidth || layoutCount !== MODES.length) return;

        const offsets = MODES.map(mode => {
            const layout = modeLayouts[mode];
            return Math.max(0, layout.x + layout.width / 2 - modeContainerWidth / 2);
        });

        setModeOffsets(offsets);

        const selectedIndex = MODES.indexOf(selectedMode);
        if (selectedIndex >= 0) {
            modeScrollRef.current?.scrollTo({ x: offsets[selectedIndex], animated: false });
        }
    }, [modeLayouts, modeContainerWidth, selectedMode]);

    const snapModeToCenter = (scrollX: number) => {
        if (!modeContainerWidth) return;
        let closestMode = selectedMode;
        let closestDistance = Number.POSITIVE_INFINITY;
        const centerX = scrollX + modeContainerWidth / 2;

        Object.entries(modeLayouts).forEach(([mode, layout]) => {
            const itemCenter = layout.x + layout.width / 2;
            const distance = Math.abs(itemCenter - centerX);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestMode = mode;
            }
        });

        if (closestMode !== selectedMode) {
            setSelectedMode(closestMode);
        }
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

    const openGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsMultipleSelection: true,
            selectionLimit: 10,
            quality: 1,
        });

        if (!result.canceled) {
            setSelectedAssetsForUpload(result.assets);
            setShowUploadModal(true);
        }
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync();
                console.log('Photo taken:', photo.uri);
                // Convert photo to ImagePicker.ImagePickerAsset format
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
                setSelectedAssetsForUpload([photoAsset]);
                setShowUploadModal(true);
            } catch (error) {
                console.error('Error taking picture:', error);
            }
        }
    };

    const toggleRecording = async () => {
        if (!cameraRef.current) return;

        if (isRecording) {
            // Stop recording
            try {
                cameraRef.current.stopRecording();
                setIsRecording(false);
            } catch (error) {
                console.error('Error stopping recording:', error);
            }
        } else {
            // Start recording
            try {
                setIsRecording(true);
                const video = await cameraRef.current.recordAsync();
                console.log('Video recorded:', video.uri);
                // Convert video to ImagePicker.ImagePickerAsset format
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
                setSelectedAssetsForUpload([videoAsset]);
                setShowUploadModal(true);
                setIsRecording(false);
            } catch (error) {
                console.error('Error recording video:', error);
                setIsRecording(false);
            }
        }
    };

    const handleCapture = () => {
        if (selectedMode === 'GÖNDERİ') {
            toggleRecording();
        } else {
            takePicture();
        }
    };

    return (
        <View style={styles.container}>
            <View style={[styles.statusBarSpacer, { height: insets.top }]} />
            {/* Camera Preview - Between status bar and bottom bar */}
            <View style={styles.cameraContainer}>
                <View style={[styles.cameraInner, { paddingLeft: insets.left, paddingRight: insets.right }]}>
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing={facing}
                        flash={flash}
                    >
                        {/* Top Header - Overlay on Camera */}
                    <View style={[styles.topBar, { paddingTop: 12 }]}>
                        <Pressable onPress={() => router.back()} style={[styles.iconButton, styles.topIconShiftLeft, styles.topBarLeft]}>
                                <X color="#FFFFFF" size={32} strokeWidth={1.8} />
                        </Pressable>

                        <View style={styles.topBarCenter}>
                            {isRecording && (
                                <View style={styles.recordingIndicator}>
                                    <View style={styles.recordingDot} />
                                    <Text style={styles.recordingText}>Kaydediliyor</Text>
                                </View>
                            )}
                            <Pressable onPress={toggleFlash} style={[styles.iconButton, styles.topIconShift]}>
                                {flash === 'off' ? (
                                    <ZapOff color="#FFFFFF" size={30} strokeWidth={2} fill="#FFFFFF" />
                                ) : (
                                    <Zap color="#FFD60A" size={30} strokeWidth={2} fill="#FFD60A" />
                                )}
                            </Pressable>
                        </View>

                        <Pressable onPress={() => console.log('Settings')} style={[styles.iconButton, styles.topIconShiftRight, styles.topBarRight]}>
                            <Cog color="#FFFFFF" size={30} strokeWidth={1.4} fill="none" />
                        </Pressable>
                    </View>
                    </CameraView>
                </View>
            </View>

            {/* Bottom Controls - Outside Camera, in Black Area */}
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
                    <Pressable onPress={handleCapture} style={[styles.captureButtonOuter, styles.captureButtonShift]}>
                        <View style={[
                            styles.captureButtonInner,
                            isRecording && styles.captureButtonRecording
                        ]} />
                    </Pressable>

                    {/* Flip Camera */}
                    <View style={styles.sideSlot}>
                        <Pressable onPress={toggleCameraFacing} style={styles.flipButton}>
                            <RefreshCcw color="#FFFFFF" size={32} strokeWidth={1.75} />
                        </Pressable>
                    </View>
                </View>

                {/* Mode Selector - Aligned with thumbnail top */}
                <View
                    style={[styles.modeSelector, styles.modeSelectorOverlay, styles.modeSelectorShift]}
                    onLayout={event => setModeContainerWidth(event.nativeEvent.layout.width)}
                >
                    <ScrollView
                        ref={modeScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={[
                            styles.modeScrollContent,
                            { paddingHorizontal: Math.max(0, modeContainerWidth / 2 - 40) - 2 },
                        ]}
                        decelerationRate="fast"
                        snapToOffsets={modeOffsets}
                        snapToAlignment="start"
                        onMomentumScrollEnd={event => snapModeToCenter(event.nativeEvent.contentOffset.x)}
                    >
                        {MODES.map((mode) => (
                            <Pressable
                                key={mode}
                                onPress={() => {
                                    setSelectedMode(mode);
                                    const layout = modeLayouts[mode];
                                    if (!layout || !modeContainerWidth) return;
                                    const targetX = Math.max(0, layout.x + layout.width / 2 - modeContainerWidth / 2);
                                    modeScrollRef.current?.scrollTo({ x: targetX, animated: true });
                                }}
                                style={styles.modeButton}
                                onLayout={event => {
                                    const { x, width } = event.nativeEvent.layout;
                                    setModeLayouts(prev => ({ ...prev, [mode]: { x, width } }));
                                }}
                            >
                                <Text
                                    style={[
                                        styles.modeText,
                                        selectedMode === mode ? styles.modeTextActive : styles.modeTextInactive,
                                    ]}
                                >
                                    {mode}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                    <LinearGradient
                        pointerEvents="none"
                        colors={['#000000', 'rgba(0, 0, 0, 0)']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={[styles.modeFadeEdge, styles.modeFadeLeft]}
                    />
                    <LinearGradient
                        pointerEvents="none"
                        colors={['rgba(0, 0, 0, 0)', '#000000']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={[styles.modeFadeEdge, styles.modeFadeRight]}
                    />
                </View>
            </View>

            {/* Upload Modal */}
            <UploadModal
                isVisible={showUploadModal}
                onClose={() => {
                    setShowUploadModal(false);
                    setSelectedAssetsForUpload([]);
                }}
                initialAssets={selectedAssetsForUpload}
                uploadMode={selectedMode === 'HİKAYE' ? 'story' : 'video'}
            />
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
    modeSelector: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeSelectorOverlay: {
        position: 'absolute',
        left: 108,
        right: 108,
        top: 0,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    modeSelectorShift: {
        transform: [{ translateY: 50 }],
    },
    modeButton: {
        paddingVertical: 0,
        paddingHorizontal: 8,
        marginHorizontal: 6,
        alignItems: 'center',
    },
    modeText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 17,
        fontWeight: '500',
    },
    modeTextInactive: {
        opacity: 0.6,
    },
    modeTextActive: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    modeScrollContent: {
        alignItems: 'center',
    },
    modeFadeEdge: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 28,
    },
    modeFadeLeft: {
        left: 0,
    },
    modeFadeRight: {
        right: 0,
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
        width: 56,
        height: 56,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#9E9E9E',
        zIndex: 999,
        transform: [{ translateY: -5 }],
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
    captureButtonRecording: {
        backgroundColor: '#FF3B30',
        borderRadius: 8,
        width: 32,
        height: 32,
    },
    flipButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ translateY: -17.5 }],
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 59, 48, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
    },
    recordingText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});
