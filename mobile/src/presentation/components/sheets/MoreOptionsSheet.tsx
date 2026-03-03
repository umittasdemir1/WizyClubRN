import React, { forwardRef, useMemo } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
    MessageSquareWarning,
    EyeOff,
    Minimize2,
    Maximize2,
    Trash2,
    LampDesk,
    GalleryVerticalEnd,
    Gauge,
    Pencil,
} from 'lucide-react-native';
import { useBrightnessStore } from '../../store/useBrightnessStore';
import { useActiveVideoStore } from '../../store/useActiveVideoStore';
import { useSurfaceTheme } from '../../hooks/useSurfaceTheme';
import { FeedMoreOptionsSheetBase } from './FeedMoreOptionsSheetBase';
import { FeedMoreOptionItem, FeedMoreSegmentedItem } from './FeedMoreOptionsSheetItems';
import { SubtitlePreferenceMode } from '../../store/useSubtitlePreferencesStore';
import ClosedCaptionsDarkIcon from '@assets/icons/editor/closed-captions-dark.svg';
import ClosedCaptionsLightIcon from '@assets/icons/editor/closed-captions-light.svg';

interface MoreOptionsSheetProps {
    onCleanScreenPress?: () => void;
    onEditPress?: () => void;
    onDeletePress?: () => void;
    showSubtitleOption?: boolean;
    subtitleMode?: SubtitlePreferenceMode;
    onSubtitleModeChange?: (mode: SubtitlePreferenceMode) => void;
    isCleanScreen?: boolean;
}

export const MoreOptionsSheet = forwardRef<BottomSheetModal, MoreOptionsSheetProps>(
    ({
        onCleanScreenPress,
        onEditPress,
        onDeletePress,
        showSubtitleOption = false,
        subtitleMode = 'off',
        onSubtitleModeChange,
        isCleanScreen = false,
    }, ref) => {
        const modalTheme = useSurfaceTheme();
        const { isDark } = modalTheme;
        const { brightness, setBrightness } = useBrightnessStore();
        const playbackRate = useActiveVideoStore((state) => state.playbackRate);
        const setPlaybackRate = useActiveVideoStore((state) => state.setPlaybackRate);
        const viewingMode = useActiveVideoStore((state) => state.viewingMode);
        const setViewingMode = useActiveVideoStore((state) => state.setViewingMode);

        const textColor = modalTheme.textPrimary;
        const borderColor = modalTheme.sheetBorder;
        const borderWidth = modalTheme.separatorWidth;
        const ClosedCaptionsIcon = isDark ? ClosedCaptionsDarkIcon : ClosedCaptionsLightIcon;

        const optionCount = useMemo(
            () =>
                6 +
                (onEditPress ? 1 : 0) +
                (onDeletePress ? 1 : 0) +
                (showSubtitleOption ? 1 : 0) +
                1.5,
            [onDeletePress, onEditPress, showSubtitleOption]
        );

        const dismiss = () => {
            if (ref && typeof ref !== 'function' && ref.current) {
                ref.current.dismiss();
            }
        };

        const eyeComfortLevels = [
            { label: 'Yumuşak', value: 0.33 },
            { label: 'Dinlendirici', value: 0.66 },
            { label: 'Doğal', value: 1.0 },
        ];
        const speedLevels = [
            { label: '0.5x', value: 0.5 },
            { label: '1x', value: 1.0 },
            { label: '1.5x', value: 1.5 },
            { label: '2x', value: 2.0 },
        ];
        const viewingModes = [
            { label: 'Kapalı', value: 'off' as const },
            { label: 'Hızlı', value: 'fast' as const },
            { label: 'Tam İzleme', value: 'full' as const },
        ];

        const activeEyeComfort = eyeComfortLevels.reduce((closest, level) => {
            return Math.abs(level.value - brightness) < Math.abs(closest.value - brightness) ? level : closest;
        }, eyeComfortLevels[0]).label;

        const activeSpeed = speedLevels.reduce((closest, level) => {
            return Math.abs(level.value - playbackRate) < Math.abs(closest.value - playbackRate) ? level : closest;
        }, speedLevels[0]).label;

        return (
            <FeedMoreOptionsSheetBase ref={ref} optionCount={optionCount}>
                <FeedMoreOptionItem
                    icon={isCleanScreen
                        ? <Minimize2 color={textColor} size={24} strokeWidth={1.2} />
                        : <Maximize2 color={textColor} size={24} strokeWidth={1.2} />}
                    label="Temiz Ekran"
                    textColor={textColor}
                    borderColor={borderColor}
                    borderWidth={borderWidth}
                    onPress={() => {
                        onCleanScreenPress?.();
                        dismiss();
                    }}
                />
                {showSubtitleOption && (
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
                        isDark={isDark}
                    />
                )}
                <FeedMoreSegmentedItem
                    icon={<LampDesk color={textColor} size={24} strokeWidth={1.2} />}
                    label="Göz Rahatlığı"
                    textColor={textColor}
                    borderColor={borderColor}
                    borderWidth={borderWidth}
                    activeLabel={activeEyeComfort}
                    onSelect={(label) => {
                        const selected = eyeComfortLevels.find((level) => level.label === label);
                        if (selected) setBrightness(selected.value);
                    }}
                    options={eyeComfortLevels.map((level) => level.label)}
                    isDark={isDark}
                />
                <FeedMoreSegmentedItem
                    icon={<Gauge color={textColor} size={24} strokeWidth={1.2} />}
                    label="Hız"
                    textColor={textColor}
                    borderColor={borderColor}
                    borderWidth={borderWidth}
                    activeLabel={activeSpeed}
                    onSelect={(label) => {
                        const selected = speedLevels.find((level) => level.label === label);
                        if (selected) setPlaybackRate(selected.value);
                    }}
                    options={speedLevels.map((level) => level.label)}
                    isDark={isDark}
                />
                <FeedMoreSegmentedItem
                    icon={<GalleryVerticalEnd color={textColor} size={24} strokeWidth={1.2} />}
                    label="İzleme Modu"
                    textColor={textColor}
                    borderColor={borderColor}
                    borderWidth={borderWidth}
                    activeLabel={viewingModes.find((mode) => mode.value === viewingMode)?.label || 'Hızlı'}
                    onSelect={(label) => {
                        const selected = viewingModes.find((mode) => mode.label === label);
                        if (selected) setViewingMode(selected.value);
                    }}
                    options={viewingModes.map((mode) => mode.label)}
                    isDark={isDark}
                />
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
                <FeedMoreOptionItem
                    icon={<MessageSquareWarning color={textColor} size={24} strokeWidth={1.2} />}
                    label="Raporla"
                    textColor={textColor}
                    borderColor={borderColor}
                    borderWidth={borderWidth}
                />
                <FeedMoreOptionItem
                    icon={<EyeOff color={textColor} size={24} strokeWidth={1.2} />}
                    label="İlgilenmiyorum"
                    textColor={textColor}
                    borderColor={borderColor}
                    borderWidth={borderWidth}
                    isLast
                />
            </FeedMoreOptionsSheetBase>
        );
    }
);
