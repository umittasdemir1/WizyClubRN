import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { StatusBar as RNStatusBar } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SwipeWrapper } from '../../src/presentation/components/shared/SwipeWrapper';
import { Search } from 'lucide-react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import {
    HeroBannerCarousel,
    CategoryCard,
    BrandAvatar,
    TicketCard,
    StackedCouponCards,
    PopularDealCard,
    PromoBanner,
} from '../../src/presentation/components/deals';

export default function DealsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    const isDark = useThemeStore((state) => state.isDark);
    const bgBody = isDark ? '#08080A' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#111827';

    useFocusEffect(
        useCallback(() => {
            RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
        }, [isDark])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // Simulate refresh
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setRefreshing(false);
    }, []);

    // Mock Data
    const adBanners = [
        { id: '1', imageUrl: 'https://raw.githubusercontent.com/umittasdemir1/WizyClubRN/main/assets/icons/1_50.png' },
        { id: '2', imageUrl: 'https://raw.githubusercontent.com/umittasdemir1/WizyClubRN/main/assets/icons/2_50.png' },
        { id: '3', imageUrl: 'https://raw.githubusercontent.com/umittasdemir1/WizyClubRN/main/assets/icons/3_50.png' },
    ];

    const categories = [
        { id: '1', title: 'Tüm\nKategoriler', iconType: 'dots', backgroundColor: isDark ? '#2d1a2e' : '#fce7f3' },
        { id: '2', title: 'Sağlık', icon: 'https://raw.githubusercontent.com/umittasdemir1/WizyClubRN/refs/heads/main/assets/icons/health.svg', backgroundColor: isDark ? '#1a2e1f' : '#f0fdf4' },
        { id: '3', title: 'Spor', icon: 'https://raw.githubusercontent.com/umittasdemir1/WizyClubRN/refs/heads/main/assets/icons/sports.svg', backgroundColor: isDark ? '#2e2419' : '#fff7ed' },
        { id: '4', title: 'Evcil\nDostlar', icon: 'https://raw.githubusercontent.com/umittasdemir1/WizyClubRN/refs/heads/main/assets/icons/pet.svg', backgroundColor: isDark ? '#1a2e28' : '#ecfdf5' },
        { id: '5', title: 'Bebek', icon: 'https://raw.githubusercontent.com/umittasdemir1/WizyClubRN/refs/heads/main/assets/icons/baby.svg', backgroundColor: isDark ? '#2a1f2e' : '#faf5ff' },
    ];

    const brands = [
        { id: '1', name: 'Nike', discount: '25%', backgroundColor: '#FFFFFF', iconUrl: 'https://raw.githubusercontent.com/umittasdemir1/WizyClubRN/refs/heads/main/assets/icons/nike.svg' },
        { id: '2', name: 'Amazon', discount: '10%', backgroundColor: '#FFFFFF', iconUrl: 'https://raw.githubusercontent.com/umittasdemir1/WizyClubRN/refs/heads/main/assets/icons/amazon.svg' },
        { id: '3', name: 'Starbucks', discount: '50%', backgroundColor: '#FFFFFF', iconUrl: 'https://raw.githubusercontent.com/umittasdemir1/WizyClubRN/refs/heads/main/assets/icons/starbucks.svg' },
        { id: '4', name: 'Apple', discount: '30%', backgroundColor: '#FFFFFF', iconUrl: 'https://raw.githubusercontent.com/umittasdemir1/WizyClubRN/refs/heads/main/assets/icons/apple.svg' },
        { id: '5', name: 'Samsung', discount: '18%', backgroundColor: '#FFFFFF', iconUrl: 'https://raw.githubusercontent.com/umittasdemir1/WizyClubRN/refs/heads/main/assets/icons/samsung.svg' },
    ];

    const trendingDeals = [
        { id: '1', brand: 'Starbucks', discount: '25%', bg: '#d4edda', accent: '#00704A' },
        { id: '2', brand: 'Amazon', discount: '10%', bg: '#ffedd5', accent: '#f97316' },
        { id: '3', brand: 'Nike', discount: '25%', bg: '#fee2e2', accent: '#ef4444' },
    ];

    const stackedCoupons = [
        { brandName: 'Store', discount: '10%', backgroundColor: '#2563eb' },
        { brandName: 'Starbucks', discount: '25%', backgroundColor: '#00704A', icon: <FontAwesome5 name="mug-hot" size={16} color="white" /> },
        { brandName: 'Store', discount: '15%', backgroundColor: '#dc2626' },
    ] as [any, any, any];

    const popularDeals = [
        { id: '1', brand: 'Netflix Pro', value: '19.99$', desc: 'buy membership', day: '27', month: 'MAY', icon: <Text style={{ fontSize: 24, fontWeight: '800', color: '#dc2626' }}>N</Text> },
        { id: '2', brand: 'Nike', value: '30%', desc: 'on any footware', day: '1', month: 'MAY', icon: <FontAwesome5 name="running" size={20} color="#111827" /> },
    ];

    return (
        <SwipeWrapper
            onSwipeLeft={() => router.push('/notifications')}
            onSwipeRight={() => router.push('/explore')}
        >
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: bgBody }]}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ width: 24 }} />
                    <Text style={[styles.headerTitle, { color: textColor }]}>Fırsatlar</Text>
                    <TouchableOpacity style={styles.searchButton}>
                        <Search size={20} color={textColor} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={isDark ? '#fff' : '#000'}
                        />
                    }
                >
                    {/* Ad Banner Carousel */}
                    <HeroBannerCarousel banners={adBanners} />

                    {/* Categories */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: textColor }]}>Kategoriler</Text>
                            <View style={styles.progressDots}>
                                <View style={[styles.progressDot, styles.progressDotActive]} />
                                <View style={[styles.progressDot, styles.progressDotInactive]} />
                            </View>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                            {categories.map((cat) => (
                                <CategoryCard
                                    key={cat.id}
                                    title={cat.title}
                                    icon={cat.icon}
                                    iconType={cat.iconType as any}
                                    backgroundColor={cat.backgroundColor}
                                    isDark={isDark}
                                />
                            ))}
                        </ScrollView>
                    </View>

                    {/* Featured Brands */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Öne Çıkan Markalar</Text>
                        <View style={styles.brandsRow}>
                            {brands.map((brand) => (
                                <BrandAvatar
                                    key={brand.id}
                                    brandName={brand.name}
                                    discount={brand.discount}
                                    backgroundColor={brand.backgroundColor}
                                    iconUrl={brand.iconUrl}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Trending Deals */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Trend Fırsatlar</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                            {trendingDeals.map((deal) => (
                                <View key={deal.id} style={{ marginRight: 12 }}>
                                    <TicketCard
                                        brandName={deal.brand}
                                        discount={deal.discount}
                                        backgroundColor={deal.bg}
                                        accentColor={deal.accent}
                                    />
                                </View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Coupons */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Kuponlar</Text>
                        <StackedCouponCards coupons={stackedCoupons} />
                        <View style={styles.dotsIndicator}>
                            <View style={[styles.indicatorDot, styles.indicatorDotActive]} />
                            <View style={[styles.indicatorDot, styles.indicatorDotInactive]} />
                            <View style={[styles.indicatorDot, styles.indicatorDotInactive]} />
                        </View>
                    </View>

                    {/* Popular Now */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: textColor }]}>Popüler Olanlar</Text>
                        {popularDeals.map((deal) => (
                            <PopularDealCard
                                key={deal.id}
                                icon={deal.icon}
                                brandName={deal.brand}
                                value={deal.value}
                                description={deal.desc}
                                expiryDay={deal.day}
                                expiryMonth={deal.month}
                                isDark={isDark}
                            />
                        ))}
                    </View>

                    {/* Promo Banners */}
                    <View style={styles.section}>
                        <PromoBanner
                            title="Bebek\nÜrünleri"
                            subtitle="UP TO 50% OFF"
                            imageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBa7RyWjSsLrX0erTuhvaQnGnskrpQGjaSmCJ-l4uAPTMLaXoIKdxY6aW_gF9Z_SwYrurrRbrk6O-0QWhIkQAHuVZcPC43Q6kT-Ar3s_wuifi3x95z7lxjcqWBIRZxtsMlYtJDtXi1beKL96pDk2odw05loc_EeBey4BuV17i0hx3AG4KSedPuQc3ensEPfqJS4Y_IJoiGTgHT6Is1wzera-FwPJKWG9_UJOSQTckKvRxDAVbCtZ0STX9ozlMUCnBsShlJdXo-Ifw"
                            backgroundColor="#e68a7c"
                            imagePosition="right"
                        />
                        <PromoBanner
                            title="Elektronik"
                            imageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuCRmV11Igi8mucWeAL4cH23lJFXUrP76_JgSmHEcn8_eG9lT35ds1aOcMwJnd-VSDnvNQRTYDiIGsIPGqYKBT7EI_avxIV-8QOO5Y-fz6hIG-DccCV_fZ1ozUvVGBVEa8S---g2hhUNKXhcFaG60Jh0psR033gS0lU6BoD96YJT53I3AspB1SJWeC9b7W4pnifJ3erxV6WJdd_rjfzeMc6ob2iEbhrbWtcXp9cK0Ny6HOwGUB8ae7jWAMqdV4eI4vZNosfqP7bNog"
                            backgroundColor="#3b6672"
                            imagePosition="left"
                        />
                    </View>

                    <View style={{ height: insets.bottom + 80 }} />
                </ScrollView>
            </View>
        </SwipeWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    searchButton: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressDots: {
        flexDirection: 'row',
        gap: 4,
    },
    progressDot: {
        height: 4,
        borderRadius: 2,
    },
    progressDotActive: {
        width: 16,
        backgroundColor: '#1f2937',
    },
    progressDotInactive: {
        width: 6,
        backgroundColor: '#d1d5db',
    },
    horizontalScroll: {
        gap: 10,
    },
    brandsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginTop: 12,
    },
    dotsIndicator: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
    },
    indicatorDot: {
        height: 6,
        borderRadius: 3,
    },
    indicatorDotActive: {
        width: 24,
        backgroundColor: '#1f2937',
    },
    indicatorDotInactive: {
        width: 12,
        backgroundColor: '#d1d5db',
    },
});
