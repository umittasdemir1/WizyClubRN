import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const GRID_GAP = 2;
const GRID_COLUMN_WIDTH_PERCENT = `${100 / GRID_COLUMNS}%`;
const APPROX_GRID_ITEM_WIDTH = SCREEN_WIDTH / GRID_COLUMNS - GRID_GAP;
const GRID_ITEM_HEIGHT = Math.round(APPROX_GRID_ITEM_WIDTH * (4 / 3));
const HEADER_BASE_HEIGHT = 62; // matches TrendingHeader: (10 top + 44 row + 8 bottom)
const SHIMMER_WIDTH = Math.round(SCREEN_WIDTH * 2.2);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient as any);

interface ExploreSkeletonProps {
    isDark?: boolean;
    topOffset?: number;
}

export function ExploreSkeleton({ isDark = true, topOffset }: ExploreSkeletonProps) {
    const insets = useSafeAreaInsets();
    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const tileColor = isDark ? '#222222' : '#D4D4D4';
    const shimmerColors = isDark
        ? ['rgba(255,255,255,0)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0)']
        : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.42)', 'rgba(255,255,255,0)'];
    const spacerHeight = topOffset ?? Math.round(insets.top + HEADER_BASE_HEIGHT);
    const rowSpan = GRID_ITEM_HEIGHT + GRID_GAP;
    const availableGridHeight = Math.max(SCREEN_HEIGHT - spacerHeight, rowSpan * 4);
    const rowCount = Math.max(5, Math.ceil(availableGridHeight / rowSpan) + 1);
    const tileCount = rowCount * GRID_COLUMNS;
    const shimmerProgress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        shimmerProgress.setValue(0);

        const loop = Animated.loop(
            Animated.timing(shimmerProgress, {
                toValue: 1,
                duration: 1700,
                easing: Easing.linear,
                useNativeDriver: true,
                isInteraction: false,
            })
        );

        loop.start();
        return () => loop.stop();
    }, [shimmerProgress]);

    const shimmerTranslateX = shimmerProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [-SHIMMER_WIDTH, SCREEN_WIDTH],
    });

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            {spacerHeight > 0 ? <View style={{ height: spacerHeight }} /> : null}
            <View style={styles.gridWrapper}>
                <View style={styles.grid}>
                    {Array.from({ length: tileCount }).map((_, index) => (
                        <View key={index} style={styles.gridItem}>
                            <View style={[styles.tile, { backgroundColor: tileColor }]} />
                        </View>
                    ))}
                </View>
                <AnimatedLinearGradient
                    pointerEvents="none"
                    colors={shimmerColors}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={[
                        styles.shimmerBand,
                        {
                            transform: [
                                { translateX: shimmerTranslateX },
                            ],
                        },
                    ]}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gridWrapper: {
        position: 'relative',
        overflow: 'hidden',
    },
    grid: {
        paddingHorizontal: 0,
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -GRID_GAP / 2,
    },
    gridItem: {
        width: GRID_COLUMN_WIDTH_PERCENT,
        paddingHorizontal: GRID_GAP / 2,
        paddingBottom: GRID_GAP,
    },
    tile: {
        width: '100%',
        height: GRID_ITEM_HEIGHT,
        borderRadius: 0,
    },
    shimmerBand: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: SHIMMER_WIDTH,
    },
});
