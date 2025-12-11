import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
    useAnimatedStyle,
    useAnimatedProps,
    runOnJS,
    useAnimatedReaction,
    SharedValue
} from 'react-native-reanimated';

// Create Animated Image component
const AnimatedImage = Animated.createAnimatedComponent(Image);

// Create Animated TextInput for lag-free timer updates
Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

interface SpritePreviewProps {
    spriteUrl: string;
    sharedTime: SharedValue<number>; // REQUIRED for performance
    frameWidth?: number;
    frameHeight?: number;
    columns?: number;
    interval?: number;
}

export const SpritePreview = ({
    spriteUrl,
    sharedTime,
    frameWidth = 200, // HD (Matched with Backend)
    frameHeight = 360,
    columns = 10,
    interval = 1,
}: SpritePreviewProps) => {
    // Start with 0 size to allow correct loading logic
    const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
    const [activeUrl, setActiveUrl] = useState(spriteUrl); // Start with provided URL (usually _0.jpg)

    // Handle Multi-Sprite Switching (Every 100s)
    useAnimatedReaction(
        () => Math.floor(sharedTime.value / 100), // Check which "Part" we need
        (sheetIndex, prevIndex) => {
            if (sheetIndex !== prevIndex) {
                // Swap URL: "..._0.jpg" -> "..._{sheetIndex}.jpg"
                let newUrl = spriteUrl;
                if (spriteUrl.match(/_\d+\.jpg$/)) {
                    newUrl = spriteUrl.replace(/_\d+\.jpg$/, `_${sheetIndex}.jpg`);
                } else if (!spriteUrl.includes('_')) {
                    // Fallback for old single files (no loop)
                    newUrl = spriteUrl;
                }

                runOnJS(setActiveUrl)(newUrl);
            }
        },
        [spriteUrl]
    );

    // 1. CALCULATE TRANSFORM ON UI THREAD (60 FPS)
    const ROWS = 10; // Backend is configured for 10x10 grid (Safety) derived from HlsService.js

    const animatedImageStyle = useAnimatedStyle(() => {
        // Frame within the CURRENT sheet (0-99)
        const localTime = sharedTime.value % 100;
        const frameIndex = Math.floor(localTime / interval);

        const colIndex = frameIndex % columns;
        let rowIndex = Math.floor(frameIndex / columns);

        // Safety: Clamp max row
        rowIndex = Math.min(rowIndex, ROWS - 1);
        rowIndex = Math.max(0, rowIndex);

        return {
            transform: [
                { translateX: -(colIndex * frameWidth) },
                { translateY: -(rowIndex * frameHeight) }
            ]
        };
    }, [columns, interval, frameWidth, frameHeight]);

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
        // OUTER CONTAINER: Window Size (e.g. 120x216)
        <View style={[styles.frameContainer, { width: frameWidth, height: frameHeight }]}>

            {/* INNER IMAGE: The massive sprite sheet (Scaled Down) */}
            {/* Logic: We force the style to be (DisplayCell * Cols) x (DisplayCell * Rows). 
                The 2000px source image will automagically scale down to fit this box. 
                Downscale = High Quality/Retina. */}
            <AnimatedImage
                source={{ uri: activeUrl }}
                style={[{
                    width: frameWidth * columns,
                    height: frameHeight * ROWS + 6,   // Increased buffer
                    marginTop: -3,                    // Aggressive crop (3px)
                }, animatedImageStyle]}
                contentFit="fill" // Force exact fill of our calculated box
                contentPosition={{ top: 0, left: 0 }}
                transition={0}
                cachePolicy="memory-disk"
                onLoad={(e) => {
                    // Optional: We don't use this for sizing anymore, 
                    // but keeping it if we need debug info.
                    setImgSize({ width: e.source.width, height: e.source.height });
                }}
            />

            {/* Time Overlay Layer */}
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
