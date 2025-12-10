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
                {/* Header Skeleton (Voice - Stories - Sun) */}
                <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
                    {/* Voice Icon */}
                    <Skeleton colorMode="dark" radius="round" height={32} width={32} />

                    {/* Stories Pill */}
                    <Skeleton colorMode="dark" radius={24} height={44} width={120} />

                    {/* Sun Icon */}
                    <Skeleton colorMode="dark" radius="round" height={32} width={32} />
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
                        <View style={{ width: 10 }} />
                        <Skeleton colorMode="dark" width={100} height={20} />
                        <View style={{ width: 10 }} />
                        <Skeleton colorMode="dark" width={60} height={24} radius={4} />
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
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    rightActions: {
        position: 'absolute',
        right: 8,
        bottom: 70, // Matches FIXED_BOTTOM_POSITION in ActionButtons.tsx
        alignItems: 'center',
        gap: 5, // Matches ActionButtons.tsx
    },
    actionItem: {
        alignItems: 'center',
        // marginBottom removed as gap handles it
    },
    bottomContent: {
        position: 'absolute',
        left: 16,
        bottom: 70, // Matches FIXED_BOTTOM_POSITION in MetadataLayer.tsx
        right: 80, // Matches MetadataLayer.tsx
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12, // Matches MetadataLayer.tsx
    },
});
