import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { X, Zap, ZapOff, Cog, RotateCcw } from 'lucide-react-native';
import { router } from 'expo-router';
import { FlashMode, CameraType } from 'expo-camera';
import { LogCode, logUI } from '@/core/services/Logger';

interface CameraBottomControlsProps {
    isRecording: boolean;
    flash: FlashMode;
    toggleFlash: () => void;
    facing: CameraType;
    toggleCameraFacing: () => void;
    onTapCapture: () => void;
    onStartRecording: () => void;
    onStopRecording: () => void;
    openGallery: () => void;
    lastPhoto: string | null;
}

export const CameraControls = ({
    isRecording,
    flash,
    toggleFlash,
    facing,
    toggleCameraFacing,
    onTapCapture,
    onStartRecording,
    onStopRecording,
    openGallery,
    lastPhoto,
}: CameraBottomControlsProps) => {
    const isLongPressCapture = useRef(false);
    const suppressNextTap = useRef(false);

    return (
        <>
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

                <Pressable onPress={() => logUI(LogCode.UI_INTERACTION, 'Camera settings button pressed')} style={[styles.iconButton, styles.topIconShiftRight, styles.topBarRight]}>
                    <Cog color="#FFFFFF" size={30} strokeWidth={1.4} fill="none" />
                </Pressable>
            </View>

            {/* Bottom Actions - Overlay on Camera */}
            <View style={[styles.bottomActions, styles.bottomActionsShift]}>
                {/* Gallery Preview */}
                <View style={styles.sideSlot}>
                    <Pressable onPress={openGallery} style={[styles.galleryButton, styles.galleryButtonShift]}>
                        {lastPhoto ? (
                            <Image source={{ uri: lastPhoto }} style={styles.galleryPreview} />
                        ) : (
                            <View style={styles.galleryPlaceholder} />
                        )}
                    </Pressable>
                </View>

                {/* Capture Button */}
                <Pressable
                    onPress={() => {
                        if (suppressNextTap.current) {
                            suppressNextTap.current = false;
                            return;
                        }
                        onTapCapture();
                    }}
                    onLongPress={() => {
                        isLongPressCapture.current = true;
                        suppressNextTap.current = true;
                        onStartRecording();
                    }}
                    delayLongPress={220}
                    onPressOut={() => {
                        if (!isLongPressCapture.current) return;
                        isLongPressCapture.current = false;
                        onStopRecording();
                    }}
                    style={[styles.captureButtonOuter, styles.captureButtonShift]}
                >
                    <View style={[
                        styles.captureButtonInner,
                        isRecording && styles.captureButtonRecording
                    ]} />
                </Pressable>

                {/* Flip Camera */}
                <View style={styles.sideSlot}>
                    <Pressable onPress={toggleCameraFacing} style={[styles.flipButton, styles.flipButtonShift]}>
                        <RotateCcw color="#FFFFFF" size={32} strokeWidth={1.8} />
                    </Pressable>
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
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
    bottomActions: {
        position: 'absolute',
        bottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        width: '100%',
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    bottomActionsShift: {
        transform: [{ translateY: 10 }],
    },
    sideSlot: {
        width: 84,
        alignItems: 'center',
    },
    galleryButton: {
        height: 70,
        aspectRatio: 2 / 3,
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.55)',
        backgroundColor: '#000',
    },
    galleryButtonShift: {
        transform: [{ translateX: -20 }],
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
        transform: [{ translateY: -50 }],
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
    },
    flipButtonShift: {
        transform: [{ translateX: 20 }],
    },
});
