import { BrandDeal } from '../../domain/entities/BrandDeal';

export const MOCK_DEALS: BrandDeal[] = [
    {
        id: 'd1',
        brandName: 'Nike',
        description: 'Summer Collection Promo',
        payout: '$500',
        requirements: ['1 Video', '2 Stories', 'Tag @nike'],
        deadline: '2025-06-30',
        logoUrl: 'https://ui-avatars.com/api/?name=Nike&background=000&color=fff',
    },
    {
        id: 'd2',
        brandName: 'Spotify',
        description: 'Music Promotion Campaign',
        payout: '$300',
        requirements: ['Use specific track', 'Creative transition'],
        deadline: '2025-07-15',
        logoUrl: 'https://ui-avatars.com/api/?name=Spotify&background=1DB954&color=fff',
    },
    {
        id: 'd3',
        brandName: 'Uber Eats',
        description: 'Late Night Cravings',
        payout: '$450',
        requirements: ['Order food in video', 'Show delivery app'],
        deadline: '2025-06-20',
        logoUrl: 'https://ui-avatars.com/api/?name=Uber+Eats&background=06C167&color=fff',
    },
];

export class MockDealDataSource {
    async getDeals(): Promise<BrandDeal[]> {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return MOCK_DEALS;
    }
}
