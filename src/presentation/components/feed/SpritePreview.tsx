import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput } from 'react-native';
import { Image } from 'expo-image';
import Animated, { 
    useAnimatedStyle, 
    useDerivedValue, 
    SharedValue,
    createAnimatedComponent,
    useAnimatedProps
} from 'react-native-reanimated';

// Create Animated Image component
const AnimatedImage = createAnimatedComponent(Image);

// Create Animated TextInput for lag-free timer updates
Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = createAnimatedComponent(TextInput);

interface SpritePreviewProps {
    spriteUrl: string;
    currentTime?: number; // Legacy, optional if using sharedTime for text
    sharedTime: SharedValue<number>; // REQUIRED for performance
    frameWidth?: number;
    frameHeight?: number;
    columns?: number;
    interval?: number;
}

export const SpritePreview = ({
    spriteUrl,
    sharedTime,
    frameWidth = 100, // Backend match (100x180)
    frameHeight = 180,
    columns = 10,
    interval = 1,
}: SpritePreviewProps) => {
    // Start with 0 size to allow correct loading logic
    const [imgSize, setImgSize] = useState({ width: 0, height: 0 });

    // 1. CALCULATE TRANSFORM ON UI THREAD (60 FPS)
    const animatedImageStyle = useAnimatedStyle(() => {
        if (imgSize.width === 0) return { transform: [{ translateX: 0 }, { translateY: 0 }] };

        const frameIndex = Math.floor(sharedTime.value / interval);
        const colIndex = frameIndex % columns;
        let rowIndex = Math.floor(frameIndex / columns);

        // Safety: Clamp max row
        if (frameHeight > 0 && imgSize.height > 0) {
            const maxRowIndex = Math.floor(imgSize.height / frameHeight) - 1;
            rowIndex = Math.min(rowIndex, maxRowIndex);
            rowIndex = Math.max(0, rowIndex);
        }

        return {
            transform: [
                { translateX: -(colIndex * frameWidth) },
                { translateY: -(rowIndex * frameHeight) }
            ]
        };
    }, [columns, interval, frameWidth, frameHeight, imgSize]);

    // 2. CALCULATE TIME TEXT ON UI THREAD (Lag-free)
    const animatedTextProps = useAnimatedProps(() => {
        const seconds = sharedTime.value;
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const text = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        return {
            text: text
        } as any;
    }, []);

    return (
        // OUTER CONTAINER: Handles the "Frame" (Size, Border, Radius, Shadow, Masking)
        // This acts as a window. Anything outside this box is cut off.
        <View style={[styles.frameContainer, { width: frameWidth, height: frameHeight }]}>

            {/* INNER IMAGE: The massive sprite sheet that moves around */}
            <AnimatedImage
                source={{ uri: spriteUrl }}
                style={[{
                    width: imgSize.width || frameWidth * columns,
                    // Safety: Use 100 rows height to prevent container shifting off-screen during seek
                    height: imgSize.height || frameHeight * 100,
                }, animatedImageStyle]} // Apply animated transform here
                onLoad={(e) => {
                    setImgSize({
                        width: e.source.width,
                        height: e.source.height
                    });
                }}
                contentFit="cover" // Logic: 'cover' ensures 1:1 pixel mapping (screens <-> image)
                contentPosition={{ top: 0, left: 0 }} // Logic: Anchor top-left
                transition={0}
                cachePolicy="memory-disk"
            />

            {/* Loading Placeholder */}
            {imgSize.width === 0 && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1a1a' }]} />
            )}

            {/* Time Overlay Layer: Sits ON TOP of the image, inside the frame */}
            <View style={styles.timeOverlay}>
                <AnimatedTextInput 
                    underlineColorAndroid="transparent"
                    editable={false}
                    style={styles.timeText}
                    animatedProps={animatedTextProps}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    frameContainer: {
        // 1. MASKING & SHAPE
        overflow: 'hidden',          // Cuts off the rest of the sprite sheet
        borderRadius: 14,            // The requested rounding
        width: 100,
        height: 180,
        backgroundColor: '#000',     // Background behind transparency

        // 2. BORDER STYLE
        borderWidth: 1,              // The requested 1px border
        borderColor: '#FFFFFF',      // The requested white color

        // 3. SHADOW (Outer Glow)
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 10,

        // 4. LAYOUT
        justifyContent: 'flex-start', // Align to top-left to match image anchor
        alignItems: 'flex-start',
    },
    timeOverlay: {
        position: 'absolute',
        bottom: 8,
        left: 0,
        right: 0,
        alignItems: 'center',        // Center text horizontally
        zIndex: 10,                  // Ensure text is above image
    },
    timeText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        fontVariant: ['tabular-nums'],
        textShadowColor: 'rgba(0, 0, 0, 0.75)', // Small text shadow for readability against video
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
        // Hack to make TextInput look like Text
        padding: 0,
        margin: 0,
        textAlign: 'center',
    },
});
