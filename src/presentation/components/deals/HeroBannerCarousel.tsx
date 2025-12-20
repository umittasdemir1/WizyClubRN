import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  runOnJS,
} from 'react-native-reanimated';

/* ------------------- AYARLAR ------------------- */
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH_RATIO = 0.85; // Ekranın %85'i
const ASPECT_RATIO = 16 / 9;    // Tam yatay (sinematik) format
const BANNER_SPACING = 15;      // Kartlar arası toplam boşluk

/* ---------------- MATEMATİKSEL HESAP ------------------- */
const BANNER_WIDTH = SCREEN_WIDTH * BANNER_WIDTH_RATIO;
const BANNER_HEIGHT = BANNER_WIDTH / ASPECT_RATIO;

// Snap aralığı: Bir kartın genişliği + arasındaki boşluk
const ITEM_SIZE = BANNER_WIDTH + BANNER_SPACING;

// Milimetrik Ortalama Formülü:
// Ekranın yarısından kartın yarısını çıkarıyoruz, margin payını dengeliyoruz.
const CONTAINER_PADDING = (SCREEN_WIDTH - BANNER_WIDTH) / 2 - (BANNER_SPACING / 2);

/* ------------------ INTERFACES --------------------- */
interface AdBanner {
  id: string;
  imageUrl: string;
  onPress?: () => void;
}

interface HeroBannerCarouselProps {
  banners: AdBanner[];
}

/* ---------------- COMPONENT ------------------- */
export function HeroBannerCarousel({ banners }: HeroBannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const updateActiveIndex = (index: number) => {
    setActiveIndex(index);
  };

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;

    // Index hesabı: Kaydırma miktarını bir tam kart boyutuna bölüyoruz
    const index = Math.round(event.contentOffset.x / ITEM_SIZE);
    runOnJS(updateActiveIndex)(index);
  });

  if (!banners || banners.length === 0) return null;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={ITEM_SIZE}      // Her kaydırmada bir ITEM_SIZE kadar ilerler
        snapToAlignment="start"         // Padding başlangıcına göre hizalar (Ortalamayı sağlar)
        scrollEventThrottle={16}
        onScroll={onScroll}
        overScrollMode="never"
        contentContainerStyle={{
          paddingHorizontal: CONTAINER_PADDING,
          alignItems: 'center',
        }}
      >
        {banners.map((banner) => (
          <TouchableOpacity
            key={banner.id}
            activeOpacity={0.9}
            onPress={banner.onPress}
            style={styles.bannerContainer}
          >
            <Image
              source={{ uri: banner.imageUrl }}
              style={styles.banner}
              contentFit="cover" // Görselin alanı tam kaplamasını sağlar
              transition={200}
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>

      {/* ---------- DOTS (GÖSTERGELER) ---------- */}
      {banners.length > 1 && (
        <View style={styles.dotsContainer}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

/* ------------------ STYLES -------------------- */
const styles = StyleSheet.create({
  container: {
    // Görsel yüksekliği + altındaki noktalar için gereken alan
    height: BANNER_HEIGHT + 40,
    marginBottom: 24,
    justifyContent: 'center',
  },
  bannerContainer: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    // Kartlar arasına eşit boşluk dağıtarak simetriyi korur
    marginHorizontal: BANNER_SPACING / 2,
    backgroundColor: '#f3f4f6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  banner: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 18, // Aktif nokta daha uzun görünür
    backgroundColor: '#1f2937',
  },
  dotInactive: {
    backgroundColor: '#d1d5db',
  },
});
