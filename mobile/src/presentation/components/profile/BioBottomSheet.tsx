import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useSurfaceTheme } from '../../hooks/useSurfaceTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BioBottomSheetProps {
  bio: string;
  isDark: boolean;
}

export const BioBottomSheet = forwardRef<BottomSheet, BioBottomSheetProps>(
  ({ bio, isDark }, ref) => {
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
      >
        <BottomSheetView style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor, borderBottomWidth: modalTheme.separatorWidth }]}>
            <Text style={[styles.title, { color: textColor }]}>Hakkında</Text>
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
            <Text style={[styles.bioText, { color: secondaryColor }]}>{bio}</Text>
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingRight: 5,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
