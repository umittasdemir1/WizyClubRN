import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useBrightnessStore } from '../../store/useBrightnessStore';

/**
 * BrightnessOverlay - Dark overlay that adjusts video brightness
 * 
 * This component should be placed over the VideoLayer to simulate
 * brightness adjustment. Lower brightness = more opaque dark overlay.
 */
export function BrightnessOverlay() {
    const brightness = useBrightnessStore((state) => state.brightness);

    // Convert brightness to overlay opacity
    // brightness 1.0 = opacity 0 (no overlay, full bright)
    // brightness 0.2 = opacity 0.6 (dark overlay)
    const overlayOpacity = (1 - brightness) * 0.75;

    if (overlayOpacity <= 0) return null;

    return (
        <View
            style={[
                styles.overlay,
                { opacity: overlayOpacity }
            ]}
            pointerEvents="none"
        />
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000',
        zIndex: 1, // Above video but below UI elements
    },
});
