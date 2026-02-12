import React from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { COLORS } from '../../../core/constants';
import { PoolFeedSkeleton } from './PoolFeedSkeleton';
import { PoolFeedHeaderOverlay } from './PoolFeedHeaderOverlay';

interface PoolFeedStatusViewsProps {
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;
    videosCount: number;
    refreshFeed: () => void;
    isCleanScreen: boolean;
    onBack: () => void;
    onUploadPress: () => void;
}

export const PoolFeedStatusViews: React.FC<PoolFeedStatusViewsProps> = ({
    isLoading,
    isRefreshing,
    error,
    videosCount,
    refreshFeed,
    isCleanScreen,
    onBack,
    onUploadPress,
}) => {
    if (isLoading && videosCount === 0) {
        return (
            <View style={styles.loadingContainer}>
                <PoolFeedSkeleton />
            </View>
        );
    }

    if (error && videosCount === 0) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Text style={styles.retryText} onPress={refreshFeed}>
                    Tekrar Dene
                </Text>
            </View>
        );
    }

    if (!isLoading && videosCount === 0) {
        return (
            <View style={styles.container}>
                <ScrollView
                    contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={refreshFeed} tintColor="#FFFFFF" />
                    }
                >
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>Henüz video yok</Text>
                        <Text style={[styles.emptySubtext, { marginTop: 10 }]}>İlk videoyu sen yükle!</Text>
                    </View>
                </ScrollView>

                {!isCleanScreen && (
                    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} pointerEvents="box-none">
                        <PoolFeedHeaderOverlay
                            onBack={onBack}
                            onUploadPress={onUploadPress}
                            showBrightnessButton={false}
                            showBack={false}
                        />
                    </Animated.View>
                )}
            </View>
        );
    }

    return null;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: COLORS.videoBackground,
    },
    errorContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
        marginBottom: 16,
    },
    retryText: {
        color: '#FFF',
        textDecorationLine: 'underline',
    },
    emptyContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: '#FFF',
    },
    emptySubtext: {
        color: '#aaa',
    },
});
