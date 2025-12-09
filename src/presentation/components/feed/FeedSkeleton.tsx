import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { Skeleton } from 'moti/skeleton';

const { width, height } = Dimensions.get('window');

export const FeedSkeleton = () => {
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
                {/* Right Side Actions */}
                <View style={styles.rightActions}>
                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={styles.actionItem}>
                            <Skeleton colorMode="dark" radius="round" height={45} width={45} />
                        </View>
                    ))}
                    <View style={styles.actionItem}>
                        <Skeleton colorMode="dark" radius="round" height={30} width={30} />
                    </View>
                </View>

                {/* Bottom Text Content */}
                <View style={styles.bottomContent}>
                    <Skeleton colorMode="dark" width={120} height={20} />
                    <View style={{ height: 10 }} />
                    <Skeleton colorMode="dark" width={width * 0.7} height={16} />
                    <View style={{ height: 6 }} />
                    <Skeleton colorMode="dark" width={width * 0.5} height={16} />
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
        justifyContent: 'center',
    },
    background: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    contentOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        paddingBottom: 100, // Tab bar height approx
        paddingHorizontal: 16,
    },
    rightActions: {
        position: 'absolute',
        right: 12,
        bottom: 120,
        alignItems: 'center',
        gap: 20,
    },
    actionItem: {
        marginBottom: 16,
    },
    bottomContent: {
        marginBottom: 20,
    },
});
