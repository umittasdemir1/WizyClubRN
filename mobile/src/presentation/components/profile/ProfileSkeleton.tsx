import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';

const { width } = Dimensions.get('window');

export const ProfileSkeleton = () => {
    const { isDark } = useThemeStore();
    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const colorMode = isDark ? 'dark' : 'light';

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <View style={styles.content}>
                
                {/* Stats & Avatar Row */}
                <View style={styles.statsRow}>
                    {/* Following */}
                    <View style={styles.statItem}>
                        <Skeleton colorMode={colorMode} width={40} height={20} />
                        <View style={{ height: 4 }} />
                        <Skeleton colorMode={colorMode} width={60} height={12} />
                    </View>

                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        <Skeleton colorMode={colorMode} radius="round" height={96} width={96} />
                    </View>

                    {/* Followers */}
                    <View style={styles.statItem}>
                        <Skeleton colorMode={colorMode} width={40} height={20} />
                        <View style={{ height: 4 }} />
                        <Skeleton colorMode={colorMode} width={60} height={12} />
                    </View>
                </View>

                <View style={{ height: 16 }} />

                {/* Name & Badge */}
                <View style={styles.centerCol}>
                    <Skeleton colorMode={colorMode} width={150} height={24} />
                </View>

                <View style={{ height: 12 }} />

                {/* Bio */}
                <View style={styles.centerCol}>
                    <Skeleton colorMode={colorMode} width={width - 60} height={14} />
                    <View style={{ height: 6 }} />
                    <Skeleton colorMode={colorMode} width={width - 100} height={14} />
                </View>

                <View style={{ height: 24 }} />

                {/* Buttons */}
                <View style={styles.buttonRow}>
                    <Skeleton colorMode={colorMode} width={(width - 40) / 2 - 5} height={36} radius={8} />
                    <View style={{ width: 10 }} />
                    <Skeleton colorMode={colorMode} width={(width - 40) / 2 - 5} height={36} radius={8} />
                </View>

                <View style={{ height: 24 }} />

                {/* Social & Clubs */}
                <View style={styles.socialRow}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <View key={i} style={{ marginHorizontal: 6 }}>
                            <Skeleton colorMode={colorMode} radius="round" height={40} width={40} />
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 20,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    avatarContainer: {
        marginHorizontal: 20,
    },
    centerCol: {
        alignItems: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        width: '100%',
        paddingHorizontal: 5,
    },
    socialRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
    }
});
