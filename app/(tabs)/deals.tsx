import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { BrandDeal } from '../../src/domain/entities/BrandDeal';
import { GetDealsUseCase } from '../../src/domain/usecases/GetDealsUseCase';
import { DealRepositoryImpl } from '../../src/data/repositories/DealRepositoryImpl';
import { Avatar } from '../../src/presentation/components/shared/Avatar';
import { DollarSign, Calendar, CheckCircle } from 'lucide-react-native';
import { LoadingIndicator } from '../../src/presentation/components/shared/LoadingIndicator';

export default function DealsScreen() {
    const insets = useSafeAreaInsets();
    const [deals, setDeals] = useState<BrandDeal[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Avatar url={item.logoUrl} size={48} />
                <View style={styles.headerText}>
                    <Text style={styles.brandName}>{item.brandName}</Text>
                    <Text style={styles.payout}>{item.payout}</Text>
                </View>
            </View>

            <Text style={styles.description}>{item.description}</Text>

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
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Text style={styles.title}>Brand Deals</Text>
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
        backgroundColor: 'black',
    },
    title: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        padding: 16,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
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
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    payout: {
        color: '#4CAF50',
        fontSize: 16,
        fontWeight: 'bold',
    },
    description: {
        color: '#ccc',
        fontSize: 14,
        marginBottom: 12,
    },
    requirements: {
        marginBottom: 16,
        gap: 8,
    },
    reqItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    reqText: {
        color: '#888',
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#333',
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
