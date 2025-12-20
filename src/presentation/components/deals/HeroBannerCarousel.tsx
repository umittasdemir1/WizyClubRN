import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useSharedValue, useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// AYARLAR
const BANNER_WIDTH = SCREEN_WIDTH * 0.85; 
const ASPECT_RATIO = 16 / 9;
const BANNER_HEIGHT = BANNER_WIDTH / ASPECT_RATIO;
const GAP = 12; // Kartlar arası boşluk

// Görseli ortalamak için gereken yan boşluk miktarı
const SIDE_SPACER = (SCREEN_WIDTH - BANNER_WIDTH) / 2;

export function HeroBannerCarousel({ banners }: { banners: any[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
    // Ortadaki kartı bulmak için kaydırma miktarını kart + boşluk genişliğine bölüyoruz
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
        snapToInterval={BANNER_WIDTH + GAP} // Tam olarak bir kart ve bir boşluk kadar kayar
        snapToAlignment="start"
        scrollEventThrottle={16}
        onScroll={onScroll}
      >
        {/* SOL BOŞLUK (Ortalamayı bu sağlar) */}
        <View style={{ width: SIDE_SPACER }} />

        {banners.map((banner, index) => (
          <TouchableOpacity
            key={banner.id}
            activeOpacity={0.9}
            onPress={banner.onPress}
            style={[
              styles.card,
              { marginRight: index === banners.length - 1 ? 0 : GAP }
            ]}
          >
            <Image
              source={{ uri: banner.imageUrl }}
              style={styles.image}
              contentFit="cover"
            />
          </TouchableOpacity>
        ))}

        {/* SAĞ BOŞLUK (Son kartın ortada kalması için) */}
        <View style={{ width: SIDE_SPACER }} />
      </Animated.ScrollView>

      {/* DOTS */}
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
    // Yüksekliği tam olarak görsel + noktalar kadar sınırlıyoruz (Aşağı kaymayı önler)
    height: BANNER_HEIGHT + 30, 
    marginVertical: 10,
  },
  card: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eee',
    // Android gölge
    elevation: 5,
    // iOS gölge
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 15,
    backgroundColor: '#333',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#ccc',
  },
});
