import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';

interface PromoBannerProps {
    title: string;
    subtitle?: string;
    imageUrl: string;
    backgroundColor: string;
    imagePosition?: 'right' | 'left';
    onShopPress?: () => void;
}

export function PromoBanner({
    title,
    subtitle,
    imageUrl,
    backgroundColor,
    imagePosition = 'right',
    onShopPress,
}: PromoBannerProps) {
    return (
        <View style={[styles.container, { backgroundColor }]}>
            {/* Left Content */}
            <View style={styles.leftContent}>
                <Text style={styles.title}>{title.toUpperCase()}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                {onShopPress && (
                    <TouchableOpacity style={styles.shopButton} onPress={onShopPress}>
                        <Text style={styles.shopButtonText}>shop</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Right/Left Image */}
            <Image
                source={{ uri: imageUrl }}
                style={[
                    styles.image,
                    imagePosition === 'right' ? styles.imageRight : styles.imageLeft,
                ]}
                contentFit={imagePosition === 'right' ? 'contain' : 'cover'}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 144,
        borderRadius: 16,
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 12,
    },
    leftContent: {
        position: 'absolute',
        left: 20,
        top: 24,
        zIndex: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        lineHeight: 24,
        color: 'white',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 10,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 12,
    },
    shopButton: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    shopButtonText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '500',
    },
    image: {
        position: 'absolute',
    },
    imageRight: {
        right: 0,
        bottom: 0,
        height: 128,
        width: 160,
    },
    imageLeft: {
        right: 0,
        top: 0,
        height: '100%',
        width: '66%',
    },
});
