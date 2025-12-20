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

// --- HASSAS AYARLAR ---
const CARD_WIDTH = SCREEN_WIDTH * 0.8; // Kart Genişliği (%80 - Daha garantidir)
const ASPECT_RATIO = 16 / 9;
const CARD_HEIGHT = CARD_WIDTH / ASPECT_RATIO;
const SPACING = 15; // Kartlar arası boşluk

// --- SİHİRLİ MATEMATİK (SPACER TEKNİĞİ) ---
// Bu genişlikteki boş kutuyu en başa koyacağız.
// Böylece ilk kart tam ortaya itilecek. Padding hesabı yok.
const SPACER_WIDTH = (SCREEN_WIDTH - CARD_WIDTH) / 2;

interface AdBanner {
  id: string;
  imageUrl: string;
  onPress?: () => void;
}

interface HeroBannerCarouselProps {
  banners: AdBanner[];
}

export function HeroBannerCarousel({ banners }: HeroBannerCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);

  // Scroll Handler
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
    // Index hesabı: Spacer'ı düştükten sonra bölüyoruz
    const index = Math.round(event.contentOffset.x / (CARD_WIDTH + SPACING));
    runOnJS(setActiveIndex)(index);
  });

  // Animasyonlu Kart Bileşeni
  const AnimatedCard = ({ item, index }: { item: AdBanner; index: number }) => {
    const animatedStyle = useAnimatedStyle(() => {
      // Bu kartın scroll üzerindeki konumu
      // (Index * Bir Kart Boyu)
      const itemOffset = index * (CARD_WIDTH + SPACING);

      const inputRange = [
        itemOffset - (CARD_WIDTH + SPACING),
        itemOffset,
        itemOffset + (CARD_WIDTH + SPACING),
      ];

      const scale = interpolate(
        scrollX.value,
        inputRange,
        [0.9, 1, 0.9], // Yanlar %90, Orta %100
        Extrapolation.CLAMP
      );

      const opacity = interpolate(
        scrollX.value,
        inputRange,
        [0.5, 1, 0.5], // Yanlar silik
        Extrapolation.CLAMP
      );

      return {
        transform: [{ scale }],
        opacity,
      };
    });

    return (
      <Animated.View style={[styles.cardWrapper, animatedStyle]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={item.onPress}
          style={styles.cardInner}
        >
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
          {/* Siyah Gradient efekt (yazı gelirse diye hazır) */}
          <View style={styles.overlay} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (!banners || banners.length === 0) return null;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        // Snap aralığı: Kart + Boşluk
        snapToInterval={CARD_WIDTH + SPACING}
        // Başlangıca hizala (Çünkü Spacer ile biz itiyoruz)
        snapToAlignment="start"
        scrollEventThrottle={16}
        onScroll={onScroll}
        // ÖNEMLİ: Padding YOK! Spacer var.
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. SOL SPACER (KÖR NOKTA) - İLK KARTI İTER */}
        <View style={{ width: SPACER_WIDTH - (SPACING / 2) }} />

        {banners.map((item, index) => (
          <View key={item.id} style={{ marginRight: SPACING }}>
             <AnimatedCard item={item} index={index} />
          </View>
        ))}

        {/* 2. SAĞ SPACER - SON KARTI ORTADA TUTAR */}
        <View style={{ width: SPACER_WIDTH - SPACING - (SPACING / 2) }} />
      </Animated.ScrollView>

      {/* DOTS (SABİT) */}
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
    height: CARD_HEIGHT + 40,
    marginTop: 10,
    marginBottom: 20,
  },
  scrollContent: {
    alignItems: 'center', // Dikey ortalama
    // paddingHorizontal YOK!
  },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    // Margin BURADA YOK, yukarıdaki View wrapper'da var
  },
  cardInner: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#222',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
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
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    height: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#fff',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#555',
  },
});
