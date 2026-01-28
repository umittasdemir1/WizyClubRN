import React from 'react';
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { COLORS } from '../../../core/constants';
import { FeedSkeleton } from './FeedSkeleton';
import { HeaderOverlay } from './HeaderOverlay';

interface FeedStatusViewsProps {
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;
    videosCount: number;
    refreshFeed: () => void;
    isCleanScreen: boolean;
    isMuted: boolean;
    toggleMute: () => void;
    setActiveTab: (tab: 'stories' | 'foryou') => void;
    activeTab: 'stories' | 'foryou';
    hasUnseenStories: boolean;
    isCustomFeed: boolean;
    onUploadPress: () => void;
    onBack: () => void;
}

export const FeedStatusViews: React.FC<FeedStatusViewsProps> = ({
    isLoading,
    isRefreshing,
    error,
    videosCount,
    refreshFeed,
    isCleanScreen,
    isMuted,
    toggleMute,
    setActiveTab,
    activeTab,
    hasUnseenStories,
    isCustomFeed,
    onUploadPress,
    onBack,
}) => {
    if (isLoading && videosCount === 0) {
        return (
            <View style={styles.loadingContainer}>
                <FeedSkeleton />
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
                        <HeaderOverlay
                            isMuted={isMuted}
                            onToggleMute={toggleMute}
                            onStoryPress={() => setActiveTab('stories')}
                            onUploadPress={onUploadPress}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            showBrightnessButton={false}
                            hasUnseenStories={hasUnseenStories}
                            showBack={isCustomFeed}
                            onBack={onBack}
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
