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
    const safeAreaBottom = Math.min(Math.max(0, bottomInset), 4);

    return (
        <View style={styles.subtitleBottomNavContainer}>
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
            <View style={{ height: safeAreaBottom }} />
        </View>
    );
};

const styles = StyleSheet.create({
    subtitleBottomNavContainer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'transparent',
        paddingTop: 2,
    },
    subtitleBottomNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 12,
        paddingVertical: 0,
        height: 20,
        transform: [{ translateY: 18 }],
        zIndex: 9999,
    },
    subtitleBottomNavButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subtitleBottomNavButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
});
