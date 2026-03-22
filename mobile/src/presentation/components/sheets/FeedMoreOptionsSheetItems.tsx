import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface OptionItemProps {
    icon: React.ReactNode;
    label: string;
    textColor: string;
    borderColor: string;
    onPress?: () => void;
    labelColor?: string;
    isLast?: boolean;
    borderWidth?: number;
}

export function FeedMoreOptionItem({
    icon,
    label,
    textColor,
    borderColor,
    onPress,
    labelColor,
    isLast = false,
    borderWidth,
}: OptionItemProps) {
    return (
        <TouchableOpacity
            style={[
                styles.optionItem,
                { borderBottomColor: borderColor, borderBottomWidth: borderWidth ?? 1 },
                isLast && styles.optionItemLast,
            ]}
            onPress={onPress}
        >
            {icon}
            <Text style={[styles.optionLabel, styles.optionLabelSimple, { color: labelColor || textColor }]}>{label}</Text>
        </TouchableOpacity>
    );
}

interface SegmentedItemProps {
    icon: React.ReactNode;
    label: string;
    hint?: string;
    textColor: string;
    borderColor: string;
    activeLabel: string;
    onSelect: (label: string) => void;
    options: string[];
    isDark: boolean;
    isLast?: boolean;
    borderWidth?: number;
}

export function FeedMoreSegmentedItem({
    icon,
    label,
    hint,
    textColor,
    borderColor,
    activeLabel,
    onSelect,
    options,
    isDark,
    isLast = false,
    borderWidth,
}: SegmentedItemProps) {
    const activeFill = '#FF3B30';
    const activeText = '#FFFFFF';
    const groupFill = isDark ? '#2c2c2e' : '#ededf0';

    return (
        <View
            style={[
                styles.optionItem,
                { borderBottomColor: borderColor, borderBottomWidth: borderWidth ?? 1 },
                isLast && styles.optionItemLast,
            ]}
        >
            <View style={styles.optionLeft}>
                {icon}
                <View style={styles.labelGroup}>
                    <Text style={[styles.optionLabel, { color: textColor }]}>{label}</Text>
                    {hint ? <Text style={[styles.optionHint, { color: textColor }]}>{hint}</Text> : null}
                </View>
            </View>
            <View style={[styles.segmentedGroup, { backgroundColor: groupFill }]}>
                {options.map((option) => {
                    const isActive = option === activeLabel;
                    return (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.segmentedOption,
                                isActive && { backgroundColor: activeFill },
                            ]}
                            onPress={() => onSelect(option)}
                        >
                            <Text style={[styles.segmentedText, { color: isActive ? activeText : textColor }]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    optionItemLast: {
        borderBottomWidth: 0,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
    },
    labelGroup: {
        marginLeft: 16,
        flexShrink: 1,
        minWidth: 0,
    },
    optionLabel: {
        fontSize: 16,
    },
    optionLabelSimple: {
        marginLeft: 16,
    },
    optionHint: {
        marginTop: 2,
        fontSize: 13,
        opacity: 0.72,
    },
    segmentedGroup: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 2,
        overflow: 'hidden',
        marginLeft: 'auto',
    },
    segmentedOption: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    segmentedText: {
        fontSize: 11,
        fontWeight: '400',
    },
});
