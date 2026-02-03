import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Image as ExpoImage } from 'expo-image';
import { useUploadStore } from '../../store/useUploadStore';
import { textShadowStyle } from '@/core/utils/shadow';
import { ThemeColors } from './types';

export const FEED_TABS = ['Senin İçin', 'Takip Edilen'] as const;
export type FeedTab = (typeof FEED_TABS)[number];

interface InfiniteFeedHeaderProps {
    activeTab: FeedTab;
    onTabChange: (tab: FeedTab) => void;
    colors: ThemeColors;
    insetTop: number;
    onUploadPress?: () => void;
}

export function InfiniteFeedHeader({
    activeTab: _activeTab,
    onTabChange: _onTabChange,
    colors,
    insetTop,
    onUploadPress,
}: InfiniteFeedHeaderProps) {
    const baseHeight = insetTop + 16; // 6 top padding + 10 bottom padding
    const headerMinHeight = baseHeight * 3;
    return (
        <View
            style={[
                styles.header,
                {
                    paddingTop: insetTop + 6,
                    minHeight: headerMinHeight,
                    borderBottomColor: colors.border,
                    backgroundColor: colors.background,
                },
            ]}
        >
            <View style={styles.leftColumn}>
                <UploadButton onPress={onUploadPress} />
                <UploadThumbnail />
            </View>
        </View>
    );
}

function UploadButton({ onPress }: { onPress?: () => void }) {
    const status = useUploadStore(state => state.status);
    const isProcessing = status === 'compressing' || status === 'uploading' || status === 'processing';

    if (!onPress || isProcessing) return null;

    return (
        <Pressable
            style={styles.iconButton}
            onPress={onPress}
            hitSlop={12}
        >
            <Plus width={32} height={32} color="#FFFFFF" strokeWidth={1.6} />
        </Pressable>
    );
}

function UploadThumbnail() {
    const thumbnailUri = useUploadStore(state => state.thumbnailUri);
    const progress = useUploadStore(state => state.progress);
    const status = useUploadStore(state => state.status);
    const isProcessing = status === 'compressing' || status === 'uploading' || status === 'processing';

    if (!thumbnailUri || !isProcessing) return null;

    return (
        <View style={thumbnailStyles.container}>
            <ExpoImage
                source={{ uri: thumbnailUri }}
                style={thumbnailStyles.image}
                contentFit="cover"
            />
            <View style={thumbnailStyles.overlay}>
                <Text style={thumbnailStyles.percentText}>%{Math.round(progress)}</Text>
            </View>
        </View>
    );
}

const thumbnailStyles = StyleSheet.create({
    container: {
        width: 48,
        height: 85,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
        marginTop: 4,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        ...textShadowStyle('rgba(0, 0, 0, 0.75)', { width: 0, height: 1 }, 3),
    },
});

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        alignItems: 'flex-start',
    },
    leftColumn: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
    },
    iconButton: {
        padding: 10,
        marginTop: 8,
        marginLeft: -6,
    },
});
