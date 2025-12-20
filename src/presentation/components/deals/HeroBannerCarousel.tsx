import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- AYARLAR ---
const BANNER_WIDTH_RATIO = 0.85; // Ekranın %85'ini kaplasın
const ASPECT_RATIO = 16 / 9; // 16:9 Yatay (Landscape) Sinematik Oran
const BANNER_SPACING = 15; // Kartlar arası boşluk

// --- HESAPLAMALAR ---
const BANNER_WIDTH = SCREEN_WIDTH * BANNER_WIDTH_RATIO;
// Yüksekliği orana göre otomatik hesapla (Daha büyük ve yatay)
const BANNER_HEIGHT = BANNER_WIDTH / ASPECT_RATIO;
// Tam ortalamak için kenar boşluğu hesabı
const SIDE_PADDING = (SCREEN_WIDTH - BANNER_WIDTH - BANNER_SPACING) / 2;

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
    const scrollViewRef = useRef<Animated.ScrollView>(null);

    const updateActiveIndex = (index: number) => {
        setActiveIndex(index);
    };

    const onScroll = useAnimatedScrollHandler((event) => {
        scrollX.value = event.contentOffset.x;
        // İndex hesaplarken toplam kart mesafesine bölüyoruz
        const index = Math.round(event.contentOffset.x / (BANNER_WIDTH + BANNER_SPACING));
        runOnJS(updateActiveIndex)(index);
    });

    if (!banners || banners.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Animated.ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled={false} // snapToInterval kullandığımız için false olmalı
                decelerationRate="fast"
                snapToInterval={BANNER_WIDTH + BANNER_SPACING} // Nerede duracağını belirler
                snapToAlignment="center" // <-- KRİTİK NOKTA: Durduğunda merkeze hizala
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                contentContainerStyle={styles.scrollContent}
                // Android'de ilk render'da kaymayı önlemek için
                overScrollMode="never"
            >
                {banners.map((banner, index) => (
                    <TouchableOpacity
                        key={banner.id}
                        activeOpacity={0.9}
                        onPress={banner.onPress}
                        style={[
                            styles.bannerContainer,
                            // İlk elemana sol, son elemana sağ ekstra boşluk vermeye gerek yok,
                            // scrollContent padding'i bunu hallediyor.
                        ]}
                    >
                        <Image
                            source={{ uri: banner.imageUrl }}
                            style={styles.banner}
                            // "cover": Alanı doldurur, taşarsa keser.
                            // Eğer görselin tamamı görünsün, kenarlar boş kalsın istersen "contain" yap.
                            contentFit="cover"
                            transition={200}
                            cachePolicy="memory-disk"
                        />
                    </TouchableOpacity>
                ))}
            </Animated.ScrollView>

            {/* Dots Indicator */}
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

const styles = StyleSheet.create({
    container: {
        // Konteyner yüksekliği banner + altındaki noktalar için biraz boşluk
        height: BANNER_HEIGHT + 40,
        marginBottom: 24,
        justifyContent: 'center',
    },
    scrollContent: {
        // <-- KRİTİK HESAPLAMA BURADA:
        // Başlangıç ve bitişte tam ortada durması için gereken boşluk.
        paddingHorizontal: SIDE_PADDING,
        alignItems: 'center',
    },
    bannerContainer: {
        width: BANNER_WIDTH,
        height: BANNER_HEIGHT, // Hesaplanan yeni büyük yükseklik
        borderRadius: 16,
        overflow: 'hidden',
        // Her kartın sadece sağına boşluk veriyoruz
        marginRight: BANNER_SPACING,
        // Gölgelendirme (İsteğe bağlı, görseli öne çıkarır)
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
        backgroundColor: '#1f2937',
        width: 16, // Aktif olan biraz daha geniş olsun
    },
    dotInactive: {
        backgroundColor: '#d1d5db',
    },
});
