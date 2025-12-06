import { BrandDeal } from '../entities/BrandDeal';
import { IDealRepository } from '../repositories/IDealRepository';

export class GetDealsUseCase {
    constructor(private dealRepository: IDealRepository) { }

    async execute(): Promise<BrandDeal[]> {
        return this.dealRepository.getDeals();
    }
}
