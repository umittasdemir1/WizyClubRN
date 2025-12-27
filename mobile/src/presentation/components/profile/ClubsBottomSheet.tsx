import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { X } from 'lucide-react-native';
import { Image } from 'expo-image';

interface Club {
  id: string;
  name: string;
  logo: string;
  collaborationCount: number;
}

interface ClubsBottomSheetProps {
  clubs: Club[];
  isDark: boolean;
}

export const ClubsBottomSheet = forwardRef<BottomSheet, ClubsBottomSheetProps>(
  ({ clubs, isDark }, ref) => {
    const snapPoints = useMemo(() => ['60%', '90%'], []);

    const bgColor = isDark ? '#1c1c1e' : '#fff';
    const textColor = isDark ? '#fff' : '#000';
    const secondaryColor = isDark ? '#888' : '#555';
    const borderColor = isDark ? '#2c2c2e' : '#e5e5e5';
    const handleColor = isDark ? '#fff' : '#000';
    const cardBg = isDark ? '#2c2c2e' : '#f5f5f5';

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
            <View>
              <Text style={[styles.title, { color: textColor }]}>İşbirliği Yapılan Markalar</Text>
              <Text style={[styles.subtitle, { color: secondaryColor }]}>
                {clubs.length} marka ile toplam{' '}
                {clubs.reduce((acc, club) => acc + club.collaborationCount, 0)} içerik
              </Text>
            </View>
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
            {clubs.map((club) => (
              <TouchableOpacity
                key={club.id}
                style={[styles.clubItem, { backgroundColor: cardBg, borderColor }]}
              >
                <View style={styles.logoContainer}>
                  <Image
                    source={{ uri: club.logo }}
                    style={styles.logo}
                    contentFit="contain"
                  />
                </View>
                <View style={styles.clubInfo}>
                  <Text style={[styles.clubName, { color: textColor }]}>{club.name}</Text>
                  <Text style={[styles.clubCount, { color: secondaryColor }]}>
                    {club.collaborationCount} içerik
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
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
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
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
  clubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  logo: {
    width: 40,
    height: 40,
  },
  clubInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  clubCount: {
    fontSize: 13,
    fontWeight: '400',
  },
});
