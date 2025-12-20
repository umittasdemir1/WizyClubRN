import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  runOnJS,
  Extrapolation,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- AYARLAR ---
const ITEM_WIDTH = SCREEN_WIDTH * 0.90; // Kart Genişliği (%85)
const ASPECT_RATIO = 16 / 9;            // Yatay Format
const ITEM_HEIGHT = ITEM_WIDTH / ASPECT_RATIO;
const ITEM_SPACING = 10;                // Kartlar arası boşluk

// --- HESAPLAMALAR (DÜZELTİLDİ) ---
// Snap (Kaydırma) Aralığı: Kart + Boşluk
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_SPACING;

// EKRAN ORTALAMA FORMÜLÜ:
// (Ekran - Kart) / 2 formülü bize kenar boşluğunu verir.
// Ancak kartın içinde de "margin" olduğu için, onu padding'den DÜŞÜYORUZ.
// Bu işlem "sağa kayma" sorununu çözer.
const CONTENT_PADDING = (SCREEN_WIDTH - ITEM_WIDTH) / 2 - (ITEM_SPACING / 2);

interface AdBanner {
  id: string;
  imageUrl: string;
  onPress?: () => void;
}

interface HeroBannerCarouselProps {
  banners: AdBanner[];
}

// --- TEKİL KART BİLEŞENİ ---
const BannerItem = ({ 
  item, 
  index, 
  scrollX, 
  onPress 
}: { 
  item: AdBanner; 
  index: number; 
  scrollX: Animated.SharedValue<number>; 
  onPress?: () => void 
}) => {
  
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * SNAP_INTERVAL,
      index * SNAP_INTERVAL,
      (index + 1) * SNAP_INTERVAL,
    ];

    // Animasyon: Ortadaki %100, yanlardakiler %92 boyutunda
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.92, 1, 0.92],
      Extrapolation.CLAMP
    );

    // Opaklık: Yanlardakiler hafif silik
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.6, 1, 0.6],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.cardContainer, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onPress}
        style={styles.cardInner}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        {/* Hafif karartma gradienti (Görselin daha şık durması için opsiyonel) */}
        <View style={styles.overlay} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- ANA BİLEŞEN ---
export function HeroBannerCarousel({ banners }: HeroBannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
    const index = Math.round(event.contentOffset.x / SNAP_INTERVAL);
    runOnJS(setActiveIndex)(index);
  });

  if (!banners || banners.length === 0) return null;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="start" // Hesapladığımız padding ile tam eşleşir
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentContainerStyle={{
          paddingHorizontal: CONTENT_PADDING, // Düzeltilmiş padding
          alignItems: 'center',
        }}
      >
        {banners.map((banner, index) => (
          <BannerItem
            key={banner.id}
            index={index}
            item={banner}
            scrollX={scrollX}
            onPress={banner.onPress}
          />
        ))}
      </Animated.ScrollView>

      {/* NOKTALAR (DOTS) - Absolute ile en alta çakıldı */}
      <View style={styles.dotsContainer}>
        {banners.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === activeIndex ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Toplam yükseklik = Kart boyu + Alt boşluk (dots için)
    height: ITEM_HEIGHT + 40,
    marginBottom: 20,
    position: 'relative', // Dots'un absolute konumlanması için gerekli
  },
  cardContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    marginHorizontal: ITEM_SPACING / 2, // Sağ ve sol boşluk
  },
  cardInner: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)', // Çok hafif karartma
  },
  dotsContainer: {
    position: 'absolute', // ScrollView'dan bağımsız
    bottom: 0,            // En alta yapışık
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 20,           // Dots alanı yüksekliği
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24, // Aktifken uzayan çubuk
    backgroundColor: '#FFFFFF',
  },
  inactiveDot: {
    width: 8,  // Pasifken yuvarlak
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
