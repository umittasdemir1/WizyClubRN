import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* --- AYARLAR --- */
const BANNER_WIDTH = SCREEN_WIDTH * 0.88; // Görseli biraz daha büyüttük
const ASPECT_RATIO = 16 / 9;
const BANNER_HEIGHT = BANNER_WIDTH / ASPECT_RATIO;
const GAP = 25; // GÖRSELLER ARASI MESAFE (Artırıldı)
const LEFT_PADDING = 15; // SOLA YAKINLIK (0 yaparsan tam yapışır, 15 idealdir)

export function HeroBannerCarousel({ banners }: { banners: any[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
    // Index hesabı: Kaydırma miktarını Kart + Boşluk genişliğine bölüyoruz
    const index = Math.round(event.contentOffset.x / (BANNER_WIDTH + GAP));
    runOnJS(setActiveIndex)(index);
  });

  if (!banners || banners.length === 0) return null;

  return (
    <View style={styles.outerContainer}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        // Snap aralığı: Kart + Boşluk
        snapToInterval={BANNER_WIDTH + GAP} 
        snapToAlignment="start"
        scrollEventThrottle={16}
        onScroll={onScroll}
        // Sol tarafa yaklaştırmak için padding kullanıyoruz
        contentContainerStyle={{ paddingLeft: LEFT_PADDING, paddingRight: 40 }}
      >
        {banners.map((banner, index) => (
          <TouchableOpacity
            key={banner.id}
            activeOpacity={0.9}
            onPress={banner.onPress}
            style={[
              styles.card,
              { marginRight: GAP } // Görseller arası büyük boşluk
            ]}
          >
            <Image
              source={{ uri: banner.imageUrl }}
              style={styles.image}
              contentFit="cover"
            />
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>

      {/* NOKTALAR (DOTS) */}
      <View style={styles.dotsRow}>
        {banners.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex ? styles.activeDot : styles.inactiveDot]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    // Yüksekliği tam sınırlayarak aşağı sarkmayı önledik
    height: BANNER_HEIGHT + 35, 
    marginVertical: 10,
  },
  card: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 18,
    backgroundColor: '#1f2937',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#d1d5db',
  },
});
