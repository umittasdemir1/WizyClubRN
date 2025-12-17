import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export const FeedSkeleton = () => {
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            {/* Background shimmy */}
            <MotiView
                from={{ opacity: 0.3 }}
                animate={{ opacity: 0.8 }}
                transition={{
                    type: 'timing',
                    duration: 1000,
                    loop: true,
                }}
                style={StyleSheet.absoluteFill}
            >
                <View style={styles.background} />
            </MotiView>

            <View style={styles.contentOverlay}>
                {/* Header Skeleton (Matches HeaderOverlay structure) */}
                <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
                    {/* Left Column: Upload & Delete */}
                    <View style={styles.leftColumn}>
                        <Skeleton colorMode="dark" radius="round" height={32} width={32} />
                        <View style={{ height: 8 }} />
                        <Skeleton colorMode="dark" radius="round" height={32} width={32} />
                    </View>

                    {/* Center: Stories Pill */}
                    <View style={[styles.centerOverlay, { top: insets.top + 12 }]}>
                        <Skeleton colorMode="dark" radius={20} height={36} width={100} />
                    </View>

                    {/* Right: Icon Group */}
                    <View style={styles.rightButtons}>
                        <Skeleton colorMode="dark" radius="round" height={32} width={32} />
                        <Skeleton colorMode="dark" radius="round" height={32} width={32} />
                        <Skeleton colorMode="dark" radius="round" height={32} width={32} />
                    </View>
                </View>

                {/* Right Side Actions - Matching ActionButtons.tsx */}
                <View style={styles.rightActions}>
                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={styles.actionItem}>
                            <Skeleton colorMode="dark" radius="round" height={36} width={36} />
                            <View style={{ height: 4 }} />
                            <Skeleton colorMode="dark" width={20} height={10} />
                        </View>
                    ))}
                    {/* More Button */}
                    <View style={styles.actionItem}>
                        <Skeleton colorMode="dark" radius="round" height={28} width={28} />
                    </View>
                </View>

                {/* Bottom Metadata - Matching MetadataLayer.tsx */}
                <View style={styles.bottomContent}>
                    {/* User Info Row */}
                    <View style={styles.userInfoRow}>
                        <Skeleton colorMode="dark" radius="round" height={40} width={40} />
                        <View style={{ width: 12 }} />
                        <View style={{ flex: 1 }}>
                            <Skeleton colorMode="dark" width={100} height={16} />
                            <View style={{ height: 4 }} />
                            <Skeleton colorMode="dark" width={80} height={12} />
                        </View>
                        <Skeleton colorMode="dark" width={80} height={32} radius={20} />
                    </View>

                    <View style={{ height: 12 }} />

                    {/* Description */}
                    <Skeleton colorMode="dark" width={width * 0.7} height={16} />
                    <View style={{ height: 6 }} />
                    <Skeleton colorMode="dark" width={width * 0.5} height={16} />

                    {/* Commercial Tag */}
                    <View style={{ height: 12 }} />
                    <Skeleton colorMode="dark" width={140} height={20} radius={4} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width,
        height,
        backgroundColor: '#000',
    },
    background: {
        flex: 1,
        backgroundColor: '#111',
    },
    contentOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
    },
    leftColumn: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    centerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    rightButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rightActions: {
        position: 'absolute',
        right: 12,
        bottom: 120, // Matches refined BASE_BOTTOM_POSITION in ActionButtons.tsx
        alignItems: 'center',
        gap: 5, // Matches ActionButtons.tsx
    },
    actionItem: {
        alignItems: 'center',
    },
    bottomContent: {
        position: 'absolute',
        left: 16,
        bottom: 40, // Matches refined BASE_BOTTOM_POSITION in MetadataLayer.tsx
        right: 80, // Matches MetadataLayer.tsx
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12, // Matches MetadataLayer.tsx
    },
});
