import React, { forwardRef, useMemo } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
    MessageSquareWarning,
    EyeOff,
    Trash2,
    Pencil,
    UserMinus,
    Info,
    Star,
    CircleUserRound,
    Bookmark,
    QrCode,
} from 'lucide-react-native';
import { useSurfaceTheme } from '../../hooks/useSurfaceTheme';
import { FeedMoreOptionsSheetBase } from '../sheets/FeedMoreOptionsSheetBase';
import { FeedMoreOptionItem, FeedMoreSegmentedItem } from '../sheets/FeedMoreOptionsSheetItems';
import { SubtitlePreferenceMode } from '../../store/useSubtitlePreferencesStore';
import ClosedCaptionsDarkIcon from '../../../../assets/icons/closed-captions-dark.svg';
import ClosedCaptionsLightIcon from '../../../../assets/icons/closed-captions-light.svg';

interface InfiniteFeedMoreOptionsSheetProps {
    onSavePress?: () => void;
    onQrCodePress?: () => void;
    onEditPress?: () => void;
    onDeletePress?: () => void;
    onUnfollowPress?: () => void;
    onWhyThisPostPress?: () => void;
    onShowMorePress?: () => void;
    onAboutAccountPress?: () => void;
    showSubtitleOption?: boolean;
    subtitleMode?: SubtitlePreferenceMode;
    onSubtitleModeChange?: (mode: SubtitlePreferenceMode) => void;
    isFollowingCreator?: boolean;
    onSheetStateChange?: (isOpen: boolean) => void;
}

export const InfiniteFeedMoreOptionsSheet = forwardRef<BottomSheetModal, InfiniteFeedMoreOptionsSheetProps>(
    ({
        onSavePress,
        onQrCodePress,
        onEditPress,
        onDeletePress,
        onUnfollowPress,
        onWhyThisPostPress,
        onShowMorePress,
        onAboutAccountPress,
        showSubtitleOption = false,
        subtitleMode = 'off',
        onSubtitleModeChange,
        isFollowingCreator = false,
        onSheetStateChange,
    }, ref) => {
        const modalTheme = useSurfaceTheme();
        const textColor = modalTheme.textPrimary;
        const borderColor = modalTheme.sheetBorder;
        const borderWidth = modalTheme.separatorWidth;
        const ClosedCaptionsIcon = modalTheme.isDark ? ClosedCaptionsDarkIcon : ClosedCaptionsLightIcon;

        const optionCount = useMemo(
            () =>
                (onEditPress ? 1 : 0) +
                (onDeletePress ? 1 : 0) +
                (isFollowingCreator ? 1 : 0) +
                (showSubtitleOption ? 1 : 0) +
                2.5 +
                2 +
                3,
            [isFollowingCreator, onDeletePress, onEditPress, showSubtitleOption]
        );

        const dismiss = () => {
            if (ref && typeof ref !== 'function' && ref.current) {
                ref.current.dismiss();
            }
        };

        return (
            <FeedMoreOptionsSheetBase
                ref={ref}
                optionCount={optionCount}
                onSheetStateChange={onSheetStateChange}
            >
                <View style={[styles.quickActionsRow, { borderBottomColor: borderColor, borderBottomWidth: borderWidth ?? 1 }]}>
                    <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => {
                            onSavePress?.();
                            dismiss();
                        }}
                    >
                        <Bookmark color={textColor} size={30} strokeWidth={1.2} />
                        <Text style={[styles.quickActionLabel, { color: textColor }]}>Kaydet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => {
                            onQrCodePress?.();
                            dismiss();
                        }}
                    >
                        <QrCode color={textColor} size={30} strokeWidth={1.2} />
                        <Text style={[styles.quickActionLabel, { color: textColor }]}>QR kodu</Text>
                    </TouchableOpacity>
                </View>
                {showSubtitleOption ? (
                    <FeedMoreSegmentedItem
                        icon={<ClosedCaptionsIcon width={24} height={24} />}
                        label="Altyazı"
                        hint="Videodan oluşturulan otomatik altyazıları gösterir"
                        textColor={textColor}
                        borderColor={borderColor}
                        borderWidth={borderWidth}
                        activeLabel={
                            subtitleMode === 'always'
                                ? 'Her Zaman'
                                : subtitleMode === 'on'
                                    ? 'Açık'
                                    : 'Kapalı'
                        }
                        onSelect={(label) => {
                            if (!onSubtitleModeChange) return;
                            if (label === 'Her Zaman') {
                                onSubtitleModeChange('always');
                            } else if (label === 'Açık') {
                                onSubtitleModeChange('on');
                            } else {
                                onSubtitleModeChange('off');
                            }
                        }}
                        options={['Kapalı', 'Açık', 'Her Zaman']}
                        isDark={modalTheme.isDark}
                    />
                ) : null}
                {onEditPress && (
                    <FeedMoreOptionItem
                        icon={<Pencil color={textColor} size={24} strokeWidth={1.2} />}
                        label="Düzenle"
                        textColor={textColor}
                        borderColor={borderColor}
                        borderWidth={borderWidth}
                        onPress={() => {
                            onEditPress();
                            dismiss();
                        }}
                    />
                )}
                {onDeletePress && (
                    <FeedMoreOptionItem
                        icon={<Trash2 color={textColor} size={24} strokeWidth={1.2} />}
                        label="Sil"
                        textColor={textColor}
                        borderColor={borderColor}
                        borderWidth={borderWidth}
                        onPress={() => {
                            onDeletePress();
                            dismiss();
                        }}
                    />
                )}
                {isFollowingCreator && onUnfollowPress && (
                    <FeedMoreOptionItem
                        icon={<UserMinus color={textColor} size={24} strokeWidth={1.2} />}
                        label="Takibi bırak"
                        textColor={textColor}
                        borderColor={borderColor}
                        borderWidth={borderWidth}
                        onPress={() => {
                            onUnfollowPress();
                            dismiss();
                        }}
                    />
                )}
                <FeedMoreOptionItem
                    icon={<Info color={textColor} size={24} strokeWidth={1.2} />}
                    label="Neden bu gönderiyi görüyorsun?"
                    textColor={textColor}
                    borderColor={borderColor}
                    borderWidth={borderWidth}
                    onPress={() => {
                        onWhyThisPostPress?.();
                        dismiss();
                    }}
                />
                <FeedMoreOptionItem
                    icon={<Star color={textColor} size={24} strokeWidth={1.2} />}
                    label="Daha fazla göster"
                    textColor={textColor}
                    borderColor={borderColor}
                    borderWidth={borderWidth}
                    onPress={() => {
                        onShowMorePress?.();
                        dismiss();
                    }}
                />
                <FeedMoreOptionItem
                    icon={<EyeOff color={textColor} size={24} strokeWidth={1.2} />}
                    label="İlgilenmiyorum"
                    textColor={textColor}
                    borderColor={borderColor}
                    borderWidth={borderWidth}
                />
                <FeedMoreOptionItem
                    icon={<CircleUserRound color={textColor} size={24} strokeWidth={1.2} />}
                    label="Bu hesap hakkında"
                    textColor={textColor}
                    borderColor={borderColor}
                    borderWidth={borderWidth}
                    onPress={() => {
                        onAboutAccountPress?.();
                        dismiss();
                    }}
                />
                <FeedMoreOptionItem
                    icon={<MessageSquareWarning color={textColor} size={24} strokeWidth={1.2} />}
                    label="Bildir"
                    textColor={textColor}
                    borderColor={borderColor}
                    borderWidth={borderWidth}
                    isLast
                />
            </FeedMoreOptionsSheetBase>
        );
    }
);

const styles = StyleSheet.create({
    quickActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
        paddingTop: 0,
        paddingBottom: 8,
        marginBottom: 2,
    },
    quickActionButton: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 96,
        paddingVertical: 8,
    },
    quickActionLabel: {
        marginTop: 8,
        fontSize: 13,
        fontWeight: '600',
    },
});
