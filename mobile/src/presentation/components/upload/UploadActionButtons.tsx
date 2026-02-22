import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { Captions, Scissors } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { UploadComposerQuality, UploadComposerSubtitleLanguage } from '../../store/useUploadComposerStore';

interface UploadActionButtonsProps {
    insets: { top: number; bottom: number; left: number; right: number };
    isQualityMenuOpen: boolean;
    setIsQualityMenuOpen: (isOpen: boolean) => void;
    qualityPreset: UploadComposerQuality;
    setQualityPreset: (quality: UploadComposerQuality) => void;

    isCaptionsMenuOpen: boolean;
    setIsCaptionsMenuOpen: (isOpen: boolean) => void;
    subtitleLanguage: UploadComposerSubtitleLanguage;
    setSubtitleLanguage: (lang: UploadComposerSubtitleLanguage) => void;

    hasSubtitles: boolean;
    isSttLoading: boolean;
    onToggleCaptionsTap: () => void;
}

export const UploadActionButtons = ({
    insets,
    isQualityMenuOpen,
    setIsQualityMenuOpen,
    qualityPreset,
    setQualityPreset,
    isCaptionsMenuOpen,
    setIsCaptionsMenuOpen,
    subtitleLanguage,
    setSubtitleLanguage,
    hasSubtitles,
    isSttLoading,
    onToggleCaptionsTap,
}: UploadActionButtonsProps) => {
    return (
        <View style={[styles.mediaSideActions, { top: insets.top + 70, left: 16 }]}>
            <View>
                <Pressable
                    style={styles.sideActionItem}
                    onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setIsQualityMenuOpen(!isQualityMenuOpen);
                    }}
                >
                    <View style={styles.hdBadge}>
                        <Text style={styles.hdText}>HD</Text>
                    </View>
                </Pressable>

                {isQualityMenuOpen && (
                    <BlurView intensity={60} tint="dark" style={styles.qualityDropdown}>
                        {(['low', 'medium', 'high'] as UploadComposerQuality[]).map((q) => (
                            <Pressable
                                key={q}
                                onPress={() => {
                                    void Haptics.selectionAsync();
                                    setQualityPreset(q);
                                    setIsQualityMenuOpen(false);
                                }}
                                style={[
                                    styles.qualityOption,
                                    qualityPreset === q && styles.qualityOptionActive
                                ]}
                            >
                                <Text style={[
                                    styles.qualityOptionText,
                                    qualityPreset === q && styles.qualityOptionTextActive
                                ]}>
                                    {q === 'low' ? 'Düşük' : q === 'medium' ? 'Orta' : 'Yüksek'}
                                </Text>
                            </Pressable>
                        ))}
                    </BlurView>
                )}
            </View>

            <View>
                <Pressable
                    style={styles.sideActionItem}
                    onPress={onToggleCaptionsTap}
                >
                    {isSttLoading ? (
                        <ActivityIndicator color="#3A8DFF" size="small" />
                    ) : (
                        <Captions
                            color="#FFFFFF"
                            size={32}
                            strokeWidth={2}
                        />
                    )}
                </Pressable>

                {isCaptionsMenuOpen && (
                    <BlurView intensity={60} tint="dark" style={styles.qualityDropdown}>
                        {[
                            { label: 'Açık', value: 'auto' as UploadComposerSubtitleLanguage },
                            { label: 'Kapalı', value: 'none' as UploadComposerSubtitleLanguage }
                        ].map((opt) => (
                            <Pressable
                                key={opt.label}
                                onPress={() => {
                                    void Haptics.selectionAsync();
                                    setSubtitleLanguage(opt.value);
                                    setIsCaptionsMenuOpen(false);
                                }}
                                style={[
                                    styles.qualityOption,
                                    subtitleLanguage === opt.value && styles.qualityOptionActive
                                ]}
                            >
                                <Text style={[
                                    styles.qualityOptionText,
                                    subtitleLanguage === opt.value && styles.qualityOptionTextActive
                                ]}>
                                    {opt.label}
                                </Text>
                            </Pressable>
                        ))}
                    </BlurView>
                )}
            </View>

            <Pressable style={styles.sideActionItem}>
                <Scissors color="#FFFFFF" size={32} strokeWidth={2} />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    mediaSideActions: {
        position: 'absolute',
        gap: 8,
        zIndex: 1000,
    },
    sideActionItem: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hdBadge: {
        borderWidth: 2,
        borderColor: '#FFFFFF',
        borderRadius: 4,
        paddingHorizontal: 4,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hdText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
    },
    qualityDropdown: {
        position: 'absolute',
        left: 50,
        top: 0,
        borderRadius: 12,
        overflow: 'hidden',
        width: 100,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        zIndex: 1001,
    },
    qualityOption: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    qualityOptionActive: {
        backgroundColor: 'rgba(58,141,255,0.15)',
    },
    qualityOptionText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    qualityOptionTextActive: {
        color: '#3A8DFF',
        fontWeight: '700',
    },
});
