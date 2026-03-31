import { BaseUseCase } from '../base/BaseUseCase';
import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { Category, CategoryType } from '@/types/firestore';

/**
 * Input for getting categories by type
 */
export interface GetCategoriesByTypeInput {
  type: CategoryType;
}

/**
 * Output containing filtered categories
 */
export interface GetCategoriesByTypeOutput {
  categories: Category[];
}

/**
 * Use Case: Get Categories By Type
 * Retrieves all categories of a specific type (INCOME or EXPENSE)
 */
export class GetCategoriesByTypeUseCase extends BaseUseCase<
  GetCategoriesByTypeInput,
  GetCategoriesByTypeOutput
> {
  constructor(private categoryRepo: ICategoryRepository) {
    super();
  }

  async execute(input: GetCategoriesByTypeInput): Promise<GetCategoriesByTypeOutput> {
    if (!input.type) {
      throw new Error('Category type is required');
    }

    if (!['INCOME', 'EXPENSE'].includes(input.type)) {
      throw new Error('Category type must be either INCOME or EXPENSE');
    }

    const categories = await this.categoryRepo.getByType(input.type);

    return { categories };
  }
}
