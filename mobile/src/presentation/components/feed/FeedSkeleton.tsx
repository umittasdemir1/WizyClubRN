import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Match exact values from actual components
const ACTION_BASE_BOTTOM = 120;
const ACTION_SAFE_AREA_OFFSET = 100;
const ACTION_RIGHT = 8;
const ACTION_GAP = 14;
const ICON_SIZE = 34;

const METADATA_BASE_BOTTOM = 80;
const METADATA_LEFT = 16;
const METADATA_RIGHT = 80;

export const FeedSkeleton = () => {
    const insets = useSafeAreaInsets();

    // Calculate exact positions like actual components
    const actionBottom = Math.max(ACTION_BASE_BOTTOM, insets.bottom + ACTION_SAFE_AREA_OFFSET);
    const metadataBottom = Math.max(METADATA_BASE_BOTTOM, insets.bottom);

    return (
        <View style={styles.container}>
            {/* Background shimmer */}
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
                {/* Right Side Actions - Exact position from ActionButtons.tsx */}
                <View style={[styles.rightActions, { bottom: actionBottom, right: ACTION_RIGHT }]}>
                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={styles.actionItem}>
                            <Skeleton colorMode="dark" radius="round" height={ICON_SIZE} width={ICON_SIZE} />
                        </View>
                    ))}
                </View>

                {/* Bottom Metadata - Exact position from MetadataLayer.tsx */}
                <View style={[styles.bottomContent, { bottom: metadataBottom, left: METADATA_LEFT, right: METADATA_RIGHT }]}>
                    {/* User Row: Avatar + Name + Username */}
                    <View style={styles.userRow}>
                        {/* Avatar - 40px like in MetadataLayer */}
                        <Skeleton colorMode="dark" radius="round" height={40} width={40} />
                        <View style={{ width: 12 }} />
                        <View style={styles.nameContainer}>
                            {/* Full Name - 15px font, approx width */}
                            <Skeleton colorMode="dark" width={90} height={15} radius={4} />
                            <View style={{ height: 4 }} />
                            {/* Username - 12px font */}
                            <Skeleton colorMode="dark" width={65} height={12} radius={4} />
                        </View>
                    </View>

                    {/* Description - 2 lines, 14px font, 20px line height */}
                    <View style={styles.descriptionRow}>
                        <Skeleton colorMode="dark" width={width * 0.55} height={14} radius={4} />
                        <View style={{ height: 6 }} />
                        <Skeleton colorMode="dark" width={width * 0.4} height={14} radius={4} />
                    </View>
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
    rightActions: {
        position: 'absolute',
        flexDirection: 'column',
        alignItems: 'center',
        gap: ACTION_GAP,
    },
    actionItem: {
        alignItems: 'center',
    },
    bottomContent: {
        position: 'absolute',
        alignItems: 'flex-start',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    nameContainer: {
        justifyContent: 'center',
    },
    descriptionRow: {
        marginBottom: 6,
    },
});
