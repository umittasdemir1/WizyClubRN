import { IDealRepository } from '../../domain/repositories/IDealRepository';
import { BrandDeal } from '../../domain/entities/BrandDeal';
import { MockDealDataSource } from '../datasources/MockDealDataSource';

export class DealRepositoryImpl implements IDealRepository {
    private dataSource: MockDealDataSource;

    constructor() {
        this.dataSource = new MockDealDataSource();
    }

    async getDeals(): Promise<BrandDeal[]> {
        return this.dataSource.getDeals();
    }
}
