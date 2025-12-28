import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SettingsBottomSheetProps {
  isDark: boolean;
  onThemeToggle: () => void;
  onDeletedContentPress: () => void;
}

export const SettingsBottomSheet = forwardRef<BottomSheet, SettingsBottomSheetProps>(
  ({ isDark, onThemeToggle, onDeletedContentPress }, ref) => {
    const insets = useSafeAreaInsets();

    const topOffset = insets.top + 60 + 25;
    const snapPoints = useMemo(() => [SCREEN_HEIGHT - topOffset], [insets.top]);

    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const bgColor = isDark ? '#1c1c1e' : themeColors.background;
    const textColor = isDark ? '#fff' : '#000';
    const secondaryColor = isDark ? '#888' : '#555';
    const borderColor = isDark ? '#2c2c2e' : '#e5e5e5';
    const handleColor = isDark ? '#fff' : '#000';

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
        backgroundStyle={{ backgroundColor: bgColor, borderTopLeftRadius: 40, borderTopRightRadius: 40 }}
        handleIndicatorStyle={{ backgroundColor: handleColor }}
        enableOverDrag={false}
      >
        <BottomSheetView style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
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
            <View style={[styles.settingItem, { borderBottomColor: borderColor }]}>
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
                  Son 15 gün içinde silinenleri geri yükle
                </Text>
              </View>
              {/* Chevron or icon */}
              <Text style={{ color: secondaryColor, fontSize: 18 }}>›</Text>
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
    borderBottomWidth: 1,
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
    borderBottomWidth: 1,
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
