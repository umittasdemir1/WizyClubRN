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



// --- SENİN İSTEDİĞİN AYARLAR ---

const CARD_WIDTH = SCREEN_WIDTH * 0.92; // KARTLARI ÇOK BÜYÜTTÜK (%92)

const ASPECT_RATIO = 16 / 9;

const CARD_HEIGHT = CARD_WIDTH / ASPECT_RATIO;

const GAP = 12.5; // Kartlar arası boşluk (Azalttık ki kopuk durmasın)



// --- KRİTİK HİZALAMA AYARI ---

// Burası ilk kartın solundaki boşluktur.

// Kart %92 olduğu için kalan boşluk %8'dir. Bunun yarısı %4 sağa, %4 sola düşer.

const SIDE_OFFSET = (SCREEN_WIDTH - CARD_WIDTH) / 7.5;



export function HeroBannerCarousel({ banners }: { banners: any[] }) {

  const [activeIndex, setActiveIndex] = useState(0);

  const scrollX = useSharedValue(0);



  // Scroll İşleyici

  const onScroll = useAnimatedScrollHandler((event) => {

    scrollX.value = event.contentOffset.x;

    // Matematik: (Offset) / (Kart + Boşluk)

    const index = Math.round(event.contentOffset.x / (CARD_WIDTH + GAP));

    runOnJS(setActiveIndex)(index);

  });



  // Animasyonlu Kart

  const AnimatedCard = ({ item, index }: { item: any; index: number }) => {

    const animatedStyle = useAnimatedStyle(() => {

      // Bu kartın pozisyonu

      const itemOffset = index * (CARD_WIDTH + GAP);

      

      const inputRange = [

        itemOffset - (CARD_WIDTH + GAP),

        itemOffset,

        itemOffset + (CARD_WIDTH + GAP),

      ];



      const scale = interpolate(

        scrollX.value,

        inputRange,

        [0.9, 1, 0.9], // Aktif olmayanlar %10 küçülsün

        Extrapolation.CLAMP

      );



      const opacity = interpolate(

        scrollX.value,

        inputRange,

        [0.5, 1, 0.5], // Aktif olmayanlar silikleşsin

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

          activeOpacity={0.95}

          onPress={item.onPress}

          style={styles.cardInner}

        >

          <Image

            source={{ uri: item.imageUrl }}

            style={styles.image}

            contentFit="cover"

            transition={200}

          />

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

        // Snap aralığı: Kart + Boşluk kadar

        snapToInterval={CARD_WIDTH + GAP}

        // Başlangıca hizala (Çünkü Spacer ile biz itiyoruz)

        snapToAlignment="start"

        scrollEventThrottle={16}

        onScroll={onScroll}

        // Padding YOK, Margin YOK. Sadece Spacer var.

        contentContainerStyle={{ alignItems: 'center' }}

      >

        {/* SOLDAKİ BAŞLANGIÇ BOŞLUĞU (İLK KARTI ORTALAR) */}

        <View style={{ width: SIDE_OFFSET }} />



        {banners.map((item, index) => (

          <View key={item.id} style={{ marginRight: index === banners.length - 1 ? 0 : GAP }}>

            <AnimatedCard item={item} index={index} />

          </View>

        ))}



        {/* SAĞDAKİ BİTİŞ BOŞLUĞU (SON KARTI ORTALAR) */}

        <View style={{ width: SIDE_OFFSET }} />

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

    height: CARD_HEIGHT + 30, // Yükseklik tam yetsin

    marginTop: 10,

    marginBottom: 20,

  },

  cardWrapper: {

    width: CARD_WIDTH,

    height: CARD_HEIGHT,

  },

  cardInner: {

    flex: 1,

    borderRadius: 18,

    backgroundColor: '#111',

    overflow: 'hidden',

    ...Platform.select({

      ios: {

        shadowColor: '#000',

        shadowOffset: { width: 0, height: 4 },

        shadowOpacity: 0.3,

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

  dotsContainer: {

    position: 'absolute',

    bottom: 0,

    left: 0,

    right: 0,

    flexDirection: 'row',

    justifyContent: 'center',

    gap: 8,

    height: 10,

  },

  dot: {

    height: 6,

    borderRadius: 3,

  },

  activeDot: {

    width: 24,

    backgroundColor: '#fff',

  },

  inactiveDot: {

    width: 6,

    backgroundColor: '#444',

  },

});
