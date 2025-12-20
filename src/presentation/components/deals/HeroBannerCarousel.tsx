import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  runOnJS,
  Extrapolation, // SharedValue tipini ve Extrapolation'ı ekledik
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- AYARLAR ---
const ITEM_WIDTH = SCREEN_WIDTH * 0.85; // Kart Genişliği
const ASPECT_RATIO = 16 / 9;            // 16:9 Sinematik Oran
const ITEM_HEIGHT = ITEM_WIDTH / ASPECT_RATIO;
const ITEM_SPACING = 15;                // Kartlar arası boşluk

// --- MATEMATİKSEL HİZALAMA ---
// Snap aralığı (Bir kart + bir boşluk)
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_SPACING;

// Ekranda tam ortalamak için gereken kenar boşluğu
// Formül: (Ekran - Kart) / 2 - (Kartın yan boşluğu)
const CONTENT_PADDING = (SCREEN_WIDTH - ITEM_WIDTH) / 2 - (ITEM_SPACING / 2);

interface AdBanner {
  id: string;
  imageUrl: string;
  onPress?: () => void;
}

interface HeroBannerCarouselProps {
  banners: AdBanner[];
}

// --- ALT BİLEŞEN: TEKİL KART (ANIMASYON BURADA) ---
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
  
  // Reanimated Stili: Pozisyona göre büyüme/küçülme ve opaklık
  const animatedStyle = useAnimatedStyle(() => {
    // Bu kartın aktif olduğu aralıklar
    const inputRange = [
      (index - 1) * SNAP_INTERVAL,
      index * SNAP_INTERVAL,
      (index + 1) * SNAP_INTERVAL,
    ];

    // Scale (Büyüklük): Ortadaysa 1, kenardaysa 0.92
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.92, 1, 0.92],
      Extrapolation.CLAMP
    );

    // Opacity (Netlik): Ortadaysa 1, kenardaysa 0.7
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.7, 1, 0.7],
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
          cachePolicy="memory-disk"
        />
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
    // Aktif indexi hesapla
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
        snapToInterval={SNAP_INTERVAL} // Mıknatıs gibi yapışma aralığı
        snapToAlignment="start"        // Padding başlangıcına göre hizala
        scrollEventThrottle={16}       // 16ms (60fps) yenileme
        onScroll={onScroll}
        contentContainerStyle={{
          paddingHorizontal: CONTENT_PADDING,
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

      {/* NOKTALAR (DOTS) */}
      <View style={styles.dotsRow}>
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
    height: ITEM_HEIGHT + 40, // Kart + Dots boşluğu
    justifyContent: 'center',
    marginBottom: 20,
  },
  cardContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    // Her kartın sağında ve solunda eşit boşluk bırakıyoruz
    marginHorizontal: ITEM_SPACING / 2, 
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInner: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a', // Yüklenirken arka plan koyu olsun
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
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
    alignItems: 'center',
    marginTop: 15,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#fff', // WizyClub temasına uygun beyaz/koyu
  },
  inactiveDot: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
