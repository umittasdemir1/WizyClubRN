import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HeroBannerProps {
    title: string;
    subtitle: string;
    imageUrl: string;
    gradientColors?: [string, string, ...string[]];
    onShopPress?: () => void;
}

export function HeroBanner({
    title,
    subtitle,
    imageUrl,
    gradientColors = ['#e8d5f0', '#d4c4e8', '#c9e0eb'] as [string, string, ...string[]],
    onShopPress,
}: HeroBannerProps) {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                {/* Left Content */}
                <View style={styles.leftContent}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                    <TouchableOpacity style={styles.shopButton} onPress={onShopPress}>
                        <Text style={styles.shopButtonText}>shop</Text>
                    </TouchableOpacity>
                </View>

                {/* Right Image */}
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    contentFit="cover"
                />

                {/* Dots Indicator */}
                <View style={styles.dotsContainer}>
                    <View style={[styles.dot, styles.dotActive]} />
                    <View style={[styles.dot, styles.dotInactive]} />
                    <View style={[styles.dot, styles.dotInactive]} />
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 224,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 24,
    },
    gradient: {
        flex: 1,
        flexDirection: 'row',
        position: 'relative',
    },
    leftContent: {
        position: 'absolute',
        left: 20,
        top: 32,
        zIndex: 10,
        width: '50%',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        lineHeight: 28,
        color: '#111827',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: '#4b5563',
        marginBottom: 12,
    },
    shopButton: {
        backgroundColor: '#111827',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    shopButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    image: {
        position: 'absolute',
        right: 0,
        top: 0,
        width: '60%',
        height: '100%',
    },
    dotsContainer: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dotActive: {
        backgroundColor: '#1f2937',
    },
    dotInactive: {
        backgroundColor: '#d1d5db',
    },
});
