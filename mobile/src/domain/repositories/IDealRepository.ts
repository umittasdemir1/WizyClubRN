import { BrandDeal } from '../entities/BrandDeal';

export interface IDealRepository {
    getDeals(): Promise<BrandDeal[]>;
}
