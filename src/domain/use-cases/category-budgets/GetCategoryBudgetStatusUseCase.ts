import { BaseUseCase } from '../base/BaseUseCase';
import { ICategoryBudgetRepository } from '@/domain/repositories/ICategoryBudgetRepository';
import { CategoryBudget } from '@/domain/entities/CategoryBudget';

/**
 * Input DTO for getting category budget status
 */
export interface GetCategoryBudgetStatusInput {
  id: string;
}

/**
 * Output for category budget status
 */
export interface GetCategoryBudgetStatusOutput {
  categoryBudget: CategoryBudget;
  remainingAmount: number;
  usagePercentage: number;
  isExceeded: boolean;
  isApproachingLimit: boolean;
  exceededAmount: number;
}

/**
 * Use Case: Get Category Budget Status
 * Retrieves category budget with calculated status information
 */
export class GetCategoryBudgetStatusUseCase extends BaseUseCase<
  GetCategoryBudgetStatusInput,
  GetCategoryBudgetStatusOutput
> {
  constructor(private categoryBudgetRepo: ICategoryBudgetRepository) {
    super();
  }

  async execute(input: GetCategoryBudgetStatusInput): Promise<GetCategoryBudgetStatusOutput> {
    const categoryBudget = await this.categoryBudgetRepo.getById(input.id);
    if (!categoryBudget) {
      throw new Error('Category budget not found');
    }

    return {
      categoryBudget,
      remainingAmount: categoryBudget.getRemainingAmount(),
      usagePercentage: categoryBudget.getUsagePercentage(),
      isExceeded: categoryBudget.isExceeded(),
      isApproachingLimit: categoryBudget.isApproachingLimit(),
      exceededAmount: categoryBudget.getExceededAmount(),
    };
  }
}
