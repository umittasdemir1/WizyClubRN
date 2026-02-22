import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useSurfaceTheme } from '../../hooks/useSurfaceTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SettingsBottomSheetProps {
  isDark: boolean;
  onThemeToggle: () => void;
  onDeletedContentPress: () => void;
  onSignOut: () => void;
}

export const SettingsBottomSheet = forwardRef<BottomSheet, SettingsBottomSheetProps>(
  ({ isDark, onThemeToggle, onDeletedContentPress, onSignOut }, ref) => {
    const insets = useSafeAreaInsets();
    const modalTheme = useSurfaceTheme(isDark);

    const topOffset = insets.top + 60 + 25;
    const snapPoints = useMemo(() => [SCREEN_HEIGHT - topOffset], [insets.top]);

    const textColor = modalTheme.textPrimary;
    const secondaryColor = modalTheme.sheetMutedText;
    const borderColor = modalTheme.sheetBorder;

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backgroundStyle={modalTheme.styles.sheetBackground}
        handleIndicatorStyle={modalTheme.styles.sheetHandle}
        enableOverDrag={false}
      >
        <BottomSheetView style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor, borderBottomWidth: modalTheme.separatorWidth }]}>
            <Text style={[styles.title, { color: textColor }]}>Ayarlar</Text>
            <TouchableOpacity
              onPress={() => {
                if (ref && typeof ref !== 'function' && ref.current) {
                  ref.current.close();
                }
              }}
              style={styles.closeButton}
            >
              <X size={20} color={secondaryColor} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <BottomSheetScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Theme Toggle */}
            <View style={[styles.settingItem, { borderBottomColor: borderColor, borderBottomWidth: modalTheme.separatorWidth }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: textColor }]}>Tema</Text>
                <Text style={[styles.settingValue, { color: secondaryColor }]}>
                  {isDark ? 'Koyu Tema' : 'Açık Tema'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={onThemeToggle}
                trackColor={{ false: '#767577', true: '#34C759' }}
                thumbColor={'#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            </View>

            {/* Recently Deleted */}
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: borderColor }]}
              onPress={() => {
                // Close settings then open deleted content
                if (ref && typeof ref !== 'function' && ref.current) {
                  ref.current.close();
                }
                setTimeout(onDeletedContentPress, 300); // Small delay for smooth transition
              }}
            >
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: textColor }]}>Yakınlarda Silinenler</Text>
                <Text style={[styles.settingValue, { color: secondaryColor }]}>
                  Silinen içerikleri geri yükle
                </Text>
              </View>
              {/* Chevron or icon */}
              <Text style={{ color: secondaryColor, fontSize: 18 }}>›</Text>
            </TouchableOpacity>

            {/* Sign Out */}
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: 'transparent' }]}
              onPress={() => {
                if (ref && typeof ref !== 'function' && ref.current) {
                  ref.current.close();
                }
                onSignOut();
              }}
            >
              <Text style={[styles.settingLabel, { color: '#FF3B30', marginTop: 10 }]}>Çıkış Yap</Text>
            </TouchableOpacity>

          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '400',
  },
});
