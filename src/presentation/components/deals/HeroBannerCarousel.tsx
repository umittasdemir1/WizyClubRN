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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ------------------- AYARLAR ------------------- */
const BANNER_WIDTH_RATIO = 0.85;
const ASPECT_RATIO = 16 / 9;
const BANNER_SPACING = 15;

/* ---------------- MATEMATİK ------------------- */
const BANNER_WIDTH = SCREEN_WIDTH * BANNER_WIDTH_RATIO;
const BANNER_HEIGHT = BANNER_WIDTH / ASPECT_RATIO;

/**
 * ScrollView’in snap aldığı gerçek grid
 * (kart + sağ/sol spacing)
 */
const ITEM_SIZE = BANNER_WIDTH + BANNER_SPACING;

/**
 * ScrollView merkezini ITEM_SIZE’a göre ortalar
 * (kritik nokta)
 */
const CONTAINER_PADDING = (SCREEN_WIDTH - ITEM_SIZE) / 2;

/* ------------------ TYPES --------------------- */
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

    /**
     * Padding’i hesaba katarak index hesaplanır
     * (aksi halde dot + merkez kayar)
     */
    const index = Math.round(
      (event.contentOffset.x + CONTAINER_PADDING) / ITEM_SIZE
    );

    runOnJS(updateActiveIndex)(index);
  });

  if (!banners || banners.length === 0) return null;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={ITEM_SIZE}
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
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>

      {/* ---------- DOTS ---------- */}
      {banners.length > 1 && (
        <View style={styles.dotsContainer}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex
                  ? styles.dotActive
                  : styles.dotInactive,
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
    height: BANNER_HEIGHT + 40,
    marginBottom: 24,
    justifyContent: 'center',
  },
  bannerContainer: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: BANNER_SPACING / 2,
    backgroundColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
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
    width: 16,
    backgroundColor: '#1f2937',
  },
  dotInactive: {
    backgroundColor: '#d1d5db',
  },
});
