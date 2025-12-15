import { View, Text, StyleSheet, TouchableOpacity, StatusBar as RNStatusBar } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import { BrandDeal } from '../../src/domain/entities/BrandDeal';
import { GetDealsUseCase } from '../../src/domain/usecases/GetDealsUseCase';
import { DealRepositoryImpl } from '../../src/data/repositories/DealRepositoryImpl';
import { Avatar } from '../../src/presentation/components/shared/Avatar';
import { DollarSign, Calendar, CheckCircle } from 'lucide-react-native';
import { LoadingIndicator } from '../../src/presentation/components/shared/LoadingIndicator';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from 'expo-router';

export default function DealsScreen() {
    const insets = useSafeAreaInsets();
    const [deals, setDeals] = useState<BrandDeal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isDark = useThemeStore((state) => state.isDark);
    const bgBody = isDark ? '#000000' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const cardBg = isDark ? '#1a1a1a' : '#f0f0f0';

    // Update status bar when screen is focused
    useFocusEffect(
        useCallback(() => {
            RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
        }, [isDark])
    );

    useEffect(() => {
        const fetchDeals = async () => {
            const repository = new DealRepositoryImpl();
            const useCase = new GetDealsUseCase(repository);
            const data = await useCase.execute();
            setDeals(data);
            setIsLoading(false);
        };
        fetchDeals();
    }, []);

    const renderItem = ({ item }: { item: BrandDeal }) => (
        <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.cardHeader}>
                <Avatar url={item.logoUrl} size={48} />
                <View style={styles.headerText}>
                    <Text style={[styles.brandName, { color: textColor }]}>{item.brandName}</Text>
                    <Text style={styles.payout}>{item.payout}</Text>
                </View>
            </View>

            <Text style={[styles.description, { color: isDark ? '#ccc' : '#666' }]}>{item.description}</Text>

            <View style={styles.requirements}>
                {item.requirements.map((req, index) => (
                    <View key={index} style={styles.reqItem}>
                        {/* @ts-ignore */}
                        <CheckCircle size={14} color="#4CAF50" />
                        <Text style={styles.reqText}>{req}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.footer}>
                <View style={styles.deadline}>
                    {/* @ts-ignore */}
                    <Calendar size={16} color="#888" />
                    <Text style={styles.deadlineText}>Due {item.deadline}</Text>
                </View>
                <TouchableOpacity style={styles.applyButton}>
                    <Text style={styles.applyButtonText}>Apply Now</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: bgBody }]}>
            <Text style={[styles.title, { color: textColor }]}>Brand Deals</Text>
            {/* @ts-ignore */}
            <FlashList
                data={deals}
                renderItem={renderItem}
                estimatedItemSize={200}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor: 'black', // Dynamic
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        padding: 16,
    },
    listContent: {
        padding: 16,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        // backgroundColor: '#111', // Dynamic
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerText: {
        marginLeft: 12,
        flex: 1,
    },
    brandName: {
        fontSize: 18,
        fontWeight: 'bold',
        // color: 'white', // Dynamic
    },
    payout: {
        color: '#4CAF50',
        fontWeight: 'bold',
        fontSize: 16,
    },
    description: {
        // color: '#ccc', // Dynamic
        marginBottom: 16,
        lineHeight: 20,
    },
    requirements: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    reqItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    reqText: {
        color: '#4CAF50',
        fontSize: 12,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#222',
        paddingTop: 12,
    },
    deadline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    deadlineText: {
        color: '#888',
        fontSize: 12,
    },
    applyButton: {
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    applyButtonText: {
        color: 'black',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
