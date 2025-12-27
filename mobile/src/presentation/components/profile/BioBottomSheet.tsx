import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';

interface BioBottomSheetProps {
  bio: string;
  isDark: boolean;
}

export const BioBottomSheet = forwardRef<BottomSheet, BioBottomSheetProps>(
  ({ bio, isDark }, ref) => {
    const snapPoints = useMemo(() => ['70%'], []);

    const bgColor = isDark ? '#1c1c1e' : '#fff';
    const textColor = isDark ? '#fff' : '#000';
    const secondaryColor = isDark ? '#888' : '#555';
    const borderColor = isDark ? '#1c1c1e' : '#f0f0f0';
    const handleColor = isDark ? '#fff' : '#000';

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: bgColor }}
        handleIndicatorStyle={{ backgroundColor: handleColor }}
      >
        <BottomSheetView style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderColor }]}>
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
    borderBottomWidth: 1,
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
