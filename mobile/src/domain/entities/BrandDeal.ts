export interface BrandDeal {
    id: string;
    brandName: string;
    description: string;
    // New fields
    logoUrl: string;
    payout: string;
    requirements: string[];
    deadline: string;
}
