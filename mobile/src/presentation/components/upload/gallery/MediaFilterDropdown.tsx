import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image as ImageIcon, ImagePlay, ImageUp, LayoutGrid, SquarePlay } from 'lucide-react-native';

export type MediaFilter = 'nearby' | 'photos' | 'videos' | 'all' | 'drafts';

export const FILTER_OPTIONS: Array<{ key: MediaFilter; label: string }> = [
    { key: 'nearby', label: 'Yakındakiler' },
    { key: 'photos', label: 'Fotoğraflar' },
    { key: 'videos', label: 'Videolar' },
    { key: 'all', label: 'Tümü' },
    { key: 'drafts', label: 'Taslaklar' },
];

export const FILTER_ICONS: Record<MediaFilter, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
    nearby: ImagePlay,
    photos: ImageIcon,
    videos: SquarePlay,
    all: LayoutGrid,
    drafts: ImageUp,
};

interface MediaFilterDropdownProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    currentFilter: MediaFilter;
    setMediaFilter: (filter: MediaFilter) => void;
    dropdownTop: number;
}

export const MediaFilterDropdown = ({
    isOpen,
    setIsOpen,
    currentFilter,
    setMediaFilter,
    dropdownTop,
}: MediaFilterDropdownProps) => {
    if (!isOpen) return null;

    return (
        <>
            <Pressable style={styles.filterBackdrop} onPress={() => setIsOpen(false)} />
            <View style={[styles.filterMenu, { top: dropdownTop }]}>
                {FILTER_OPTIONS.map((option) => {
                    const selected = currentFilter === option.key;
                    const Icon = FILTER_ICONS[option.key];
                    return (
                        <Pressable
                            key={option.key}
                            style={[styles.filterItem, selected ? styles.filterItemActive : null]}
                            onPress={() => {
                                setMediaFilter(option.key);
                                setIsOpen(false);
                            }}
                        >
                            <View style={styles.filterItemContent}>
                                <Icon size={21} color="#FFFFFF" strokeWidth={2} />
                                <Text style={[styles.filterItemText, selected ? styles.filterItemTextActive : null]}>
                                    {option.label}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    filterBackdrop: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 4,
    },
    filterMenu: {
        position: 'absolute',
        left: 20,
        width: 220,
        borderRadius: 12,
        backgroundColor: 'rgba(8, 10, 15, 0.84)',
        zIndex: 5,
        overflow: 'hidden',
        paddingVertical: 8,
    },
    filterItem: {
        height: 46,
        paddingHorizontal: 14,
        justifyContent: 'center',
        marginBottom: 6,
    },
    filterItemActive: {
        backgroundColor: 'transparent',
    },
    filterItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    filterItemText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '500',
    },
    filterItemTextActive: {
        fontWeight: '500',
    },
});
