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
    void bottomInset;

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
        </View>
    );
};

const styles = StyleSheet.create({
    subtitleBottomNavContainer: {
        height: 34,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'transparent',
        paddingTop: 8,
        zIndex: 10000,
        elevation: 100,
    },
    subtitleBottomNavRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 12,
        transform: [{ translateY: 16 }],
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
