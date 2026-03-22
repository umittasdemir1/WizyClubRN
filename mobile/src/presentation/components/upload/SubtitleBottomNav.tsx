import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { TextSelect, CaseSensitive, ListX } from 'lucide-react-native';

interface SubtitleBottomNavProps {
    activeTab: 'text' | 'font';
    onOpenTextEditor: () => void;
    onOpenFontEditor: () => void;
    onDeleteSubtitle: () => void;
    bottomInset?: number;
}

const SUBTITLE_ACTION_ICON_SIZE = 28;

export const SubtitleBottomNav = ({
    activeTab,
    onOpenTextEditor,
    onOpenFontEditor,
    onDeleteSubtitle,
    bottomInset = 0,
}: SubtitleBottomNavProps) => {
    const safeAreaInset = Math.max(0, bottomInset);

    return (
        <View
            style={[
                styles.subtitleBottomNavContainer,
                {
                    height: 50 + safeAreaInset,
                    paddingTop: 8,
                    paddingBottom: safeAreaInset + 2,
                },
            ]}
        >
            <View style={styles.subtitleBottomNavRow}>
                <Pressable
                    style={[
                        styles.subtitleBottomNavButton,
                        activeTab === 'text' && styles.subtitleBottomNavButtonActive,
                    ]}
                    onPress={onOpenTextEditor}
                >
                    <TextSelect color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                </Pressable>
                <Pressable
                    style={[
                        styles.subtitleBottomNavButton,
                        activeTab === 'font' && styles.subtitleBottomNavButtonActive,
                    ]}
                    onPress={onOpenFontEditor}
                >
                    <CaseSensitive color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                </Pressable>
                <Pressable style={styles.subtitleBottomNavButton} onPress={onDeleteSubtitle}>
                    <ListX color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    subtitleBottomNavContainer: {
        borderTopWidth: 0,
        backgroundColor: '#080A0F',
        zIndex: 10000,
        elevation: 100,
    },
    subtitleBottomNavRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 12,
    },
    subtitleBottomNavButton: {
        width: 48,
        height: 48,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subtitleBottomNavButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
});
