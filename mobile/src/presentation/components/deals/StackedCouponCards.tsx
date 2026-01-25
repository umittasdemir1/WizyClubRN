import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { shadowStyle } from '@/core/utils/shadow';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CouponData {
    brandName: string;
    discount: string;
    backgroundColor: string;
    icon?: React.ReactNode;
}

interface StackedCouponCardsProps {
    coupons: [CouponData, CouponData, CouponData]; // Exactly 3 coupons
    onRedeem?: (index: number) => void;
}

export function StackedCouponCards({ coupons, onRedeem }: StackedCouponCardsProps) {
    const [left, center, right] = coupons;

    const renderTicketNotches = (size: number, color: string = 'white') => (
        <>
            {/* Left Notch */}
            <View style={[styles.notch, styles.leftNotch, { width: size, height: size }]}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />
                </Svg>
            </View>
            {/* Right Notch */}
            <View style={[styles.notch, styles.rightNotch, { width: size, height: size }]}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />
                </Svg>
            </View>
        </>
    );

    return (
        <View style={styles.container}>
            {/* Left Card (Blue) */}
            <View
                style={[
                    styles.card,
                    styles.sideCard,
                    styles.leftCard,
                    { backgroundColor: left.backgroundColor },
                ]}
            >
                {renderTicketNotches(18)}
                <Text style={styles.sideCardText}>{left.brandName.toUpperCase()}</Text>
            </View>

            {/* Right Card (Red) */}
            <View
                style={[
                    styles.card,
                    styles.sideCard,
                    styles.rightCard,
                    { backgroundColor: right.backgroundColor },
                ]}
            >
                {renderTicketNotches(18)}
                <Text style={styles.sideCardText}>{right.brandName.toUpperCase()}</Text>
            </View>

            {/* Center Card (Main - Starbucks Green) */}
            <TouchableOpacity
                style={[styles.card, styles.centerCard, { backgroundColor: center.backgroundColor }]}
                onPress={() => onRedeem?.(1)}
                activeOpacity={0.9}
            >
                {renderTicketNotches(22)}

                <View style={styles.centerContent}>
                    <Text style={styles.centerBrandName}>{center.brandName.toUpperCase()}</Text>

                    {/* Dashed Circle Border */}
                    <View style={styles.discountCircle}>
                        <Svg width="70" height="70" viewBox="0 0 70 70" style={styles.dashedBorder}>
                            <Circle
                                cx="35"
                                cy="35"
                                r="34"
                                stroke="rgba(255,255,255,0.4)"
                                strokeWidth="1"
                                strokeDasharray="4,4"
                                fill="none"
                            />
                        </Svg>
                        <Text style={styles.centerDiscount}>{center.discount}</Text>
                    </View>

                    <Text style={styles.centerOffText}>OFF</Text>

                    {/* Icon */}
                    {center.icon && (
                        <View style={styles.iconCircle}>
                            {center.icon}
                        </View>
                    )}

                    <TouchableOpacity style={styles.redeemButton} onPress={() => onRedeem?.(1)}>
                        <Text style={[styles.redeemButtonText, { color: center.backgroundColor }]}>
                            REDEEM
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 192,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginVertical: 10,
    },
    card: {
        position: 'absolute',
        borderRadius: 16,
        overflow: 'visible',
    },
    sideCard: {
        width: 144,
        height: 176,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadowStyle({ color: '#000', offset: { width: 0, height: 4 }, opacity: 0.15, radius: 8, elevation: 4 }),
    },
    leftCard: {
        left: 20,
        transform: [{ rotate: '-5deg' }, { scale: 0.85 }],
        zIndex: 0,
    },
    rightCard: {
        right: 20,
        transform: [{ rotate: '5deg' }, { scale: 0.85 }],
        zIndex: 0,
    },
    centerCard: {
        width: 160,
        height: 192,
        zIndex: 10,
        ...shadowStyle({ color: '#000', offset: { width: 0, height: 8 }, opacity: 0.25, radius: 12, elevation: 10 }),
    },
    sideCardText: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 2,
        color: 'rgba(255,255,255,0.7)',
    },
    notch: {
        position: 'absolute',
        top: '50%',
        zIndex: 20,
    },
    leftNotch: {
        left: -9,
        transform: [{ translateY: -9 }],
    },
    rightNotch: {
        right: -9,
        transform: [{ translateY: -9 }],
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    centerBrandName: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 2.5,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 8,
    },
    discountCircle: {
        width: 70,
        height: 70,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginBottom: 4,
    },
    dashedBorder: {
        position: 'absolute',
    },
    centerDiscount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: 'white',
        zIndex: 10,
    },
    centerOffText: {
        fontSize: 12,
        fontWeight: '500',
        color: 'white',
        marginBottom: 12,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    redeemButton: {
        backgroundColor: 'white',
        paddingHorizontal: 24,
        paddingVertical: 8,
        borderRadius: 20,
        ...shadowStyle({ color: '#000', offset: { width: 0, height: 2 }, opacity: 0.15, radius: 4, elevation: 3 }),
    },
    redeemButtonText: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1.5,
    },
});
