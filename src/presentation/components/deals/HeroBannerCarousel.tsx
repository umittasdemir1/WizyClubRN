import React, { useState, useRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    runOnJS,
} from 'react-native-reanimated';

// --- EKRAN AYARLARI ---
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- HASSAS AYARLAR ---
const CARD_WIDTH = SCREEN_WIDTH * 0.85; // Kartın çıplak genişliği
const SPACING = 15; // Kartlar arası boşluk
const ASPECT_RATIO = 16 / 9; // Yatay format

// --- OTOMATİK HESAPLAMALAR ---
const CARD_HEIGHT = CARD_WIDTH / ASPECT_RATIO;
// Bir kartın kapladığı TOPLAM ALAN (Kart + Boşluk)
const ITEM_SIZE = CARD_WIDTH + SPACING; 
// Kenar Boşluğu (Padding): Ekranın ortası ile Kartın ortasını eşitleyen formül
const SPACER = (SCREEN_WIDTH - ITEM_SIZE) / 2;

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

    const updateActiveIndex = (index: number) => {
        setActiveIndex(index);
    };

    const onScroll = useAnimatedScrollHandler((event) => {
        scrollX.value = event.contentOffset.x;
        // İndex hesabı
        const index = Math.round(event.contentOffset.x / ITEM_SIZE);
        runOnJS(updateActiveIndex)(index);
    });

    if (!banners || banners.length === 0) return null;

    return (
        <View style={styles.container}>
            <Animated.ScrollView
                horizontal
                pagingEnabled={false} 
                decelerationRate="fast"
                // Her bir adımda ne kadar kayacağını belirler (Kart + Boşluk kadar)
                snapToInterval={ITEM_SIZE} 
                // Durduğu zaman öğeyi merkeze kilitler
                snapToAlignment="start" 
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                // Kenarlardaki boşluk ayarı
                contentContainerStyle={{
                    paddingHorizontal: SPACER,
                }}
                overScrollMode="never"
            >
                {banners.map((banner, index) => (
                    <TouchableOpacity
                        key={banner.id}
                        activeOpacity={0.9}
                        onPress={banner.onPress}
                        style={styles.cardContainer}
                    >
                        <Image
                            source={{ uri: banner.imageUrl }}
                            style={styles.image}
                            contentFit="cover"
                            transition={200}
                        />
                    </TouchableOpacity>
                ))}
            </Animated.ScrollView>

            {/* Nokta Göstergeleri */}
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
        height: CARD_HEIGHT + 40, // Dots için yer açıyoruz
        marginBottom: 24,
        justifyContent: 'center',
    },
    cardContainer: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 16,
        overflow: 'hidden',
        // Her kartın sağına boşluk ekliyoruz
        marginRight: SPACING,
        
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
    image: {
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
        width: 16,
    },
    dotInactive: {
        backgroundColor: '#d1d5db',
    },
});
