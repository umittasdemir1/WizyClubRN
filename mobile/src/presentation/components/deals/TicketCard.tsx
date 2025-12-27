import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface TicketCardProps {
    brandName: string;
    discount: string;
    backgroundColor: string;
    accentColor: string;
    onRedeem?: () => void;
    width?: number;
    height?: number;
}

export function TicketCard({
    brandName,
    discount,
    backgroundColor,
    accentColor,
    onRedeem,
    width = 112,
    height = 128,
}: TicketCardProps) {
    const notchSize = 20;

    return (
        <View style={[styles.container, { width, height, backgroundColor }]}>
            {/* Left Notch */}
            <View style={[styles.notch, styles.leftNotch, { width: notchSize, height: notchSize }]}>
                <Svg width={notchSize} height={notchSize} viewBox="0 0 20 20">
                    <Circle cx="10" cy="10" r="10" fill="white" />
                </Svg>
            </View>

            {/* Right Notch */}
            <View style={[styles.notch, styles.rightNotch, { width: notchSize, height: notchSize }]}>
                <Svg width={notchSize} height={notchSize} viewBox="0 0 20 20">
                    <Circle cx="10" cy="10" r="10" fill="white" />
                </Svg>
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.brandName}>{brandName.toUpperCase()}</Text>
                <Text style={[styles.discount, { color: accentColor }]}>{discount}</Text>
                <Text style={styles.offText}>OFF</Text>
                <TouchableOpacity style={styles.redeemButton} onPress={onRedeem}>
                    <Text style={styles.redeemButtonText}>Redeem</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        position: 'relative',
        padding: 8,
    },
    notch: {
        position: 'absolute',
        top: '50%',
        zIndex: 10,
    },
    leftNotch: {
        left: -10,
        transform: [{ translateY: -10 }],
    },
    rightNotch: {
        right: -10,
        transform: [{ translateY: -10 }],
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandName: {
        fontSize: 9,
        fontWeight: '600',
        letterSpacing: 1.5,
        color: '#666',
        marginBottom: 2,
    },
    discount: {
        fontSize: 32,
        fontWeight: 'bold',
        lineHeight: 32,
    },
    offText: {
        fontSize: 10,
        color: '#888',
        marginBottom: 8,
    },
    redeemButton: {
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    redeemButtonText: {
        color: '#333',
        fontSize: 9,
        fontWeight: '600',
    },
});
