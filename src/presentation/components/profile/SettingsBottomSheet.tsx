import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import { useThemeStore } from '../../store/useThemeStore';

interface SettingsBottomSheetProps {
  isDark: boolean;
}

export const SettingsBottomSheet = forwardRef<BottomSheet, SettingsBottomSheetProps>(
  ({ isDark }, ref) => {
    const snapPoints = useMemo(() => ['50%'], []);
    const { themeMode, setThemeMode } = useThemeStore();

    const bgColor = isDark ? '#1c1c1e' : '#fff';
    const textColor = isDark ? '#fff' : '#000';
    const secondaryColor = isDark ? '#888' : '#555';
    const borderColor = isDark ? '#2c2c2e' : '#e5e5e5';
    const handleColor = isDark ? '#fff' : '#000';

    const RadioButton = ({ selected }: { selected: boolean }) => (
      <View style={[styles.radioOuter, { borderColor: selected ? '#007AFF' : secondaryColor }]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: bgColor }}
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
            {/* Theme Mode Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Karanlık Modu</Text>

              {/* Dark Mode Option */}
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: borderColor }]}
                onPress={() => setThemeMode('dark')}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, { color: textColor }]}>Açık</Text>
                </View>
                <RadioButton selected={themeMode === 'dark'} />
              </TouchableOpacity>

              {/* Light Mode Option */}
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: borderColor }]}
                onPress={() => setThemeMode('light')}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, { color: textColor }]}>Kapalı</Text>
                </View>
                <RadioButton selected={themeMode === 'light'} />
              </TouchableOpacity>

              {/* System Mode Option */}
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => setThemeMode('system')}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, { color: textColor }]}>Sistem Varsayılanı</Text>
                  <Text style={[styles.optionDescription, { color: secondaryColor }]}>
                    Cihazınızın sistem ayarlarına göre düzenleyeceğiz.
                  </Text>
                </View>
                <RadioButton selected={themeMode === 'system'} />
              </TouchableOpacity>
            </View>
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
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  optionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
    lineHeight: 16,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
});
