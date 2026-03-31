import { BaseUseCase } from '../base/BaseUseCase';
import { ICategoryBudgetRepository } from '@/domain/repositories/ICategoryBudgetRepository';
import { CategoryBudget } from '@/domain/entities/CategoryBudget';

/**
 * Input DTO for listing category budgets
 */
export interface ListCategoryBudgetsInput {
  budgetPeriodId?: string;
  categoryId?: string;
  userId?: string;
}

/**
 * Output for listing category budgets
 */
export interface ListCategoryBudgetsOutput {
  categoryBudgets: CategoryBudget[];
}

/**
 * Use Case: List Category Budgets
 * Retrieves category budgets with optional filtering
 */
export class ListCategoryBudgetsUseCase extends BaseUseCase<
  ListCategoryBudgetsInput,
  ListCategoryBudgetsOutput
> {
  constructor(private categoryBudgetRepo: ICategoryBudgetRepository) {
    super();
  }

  async execute(input: ListCategoryBudgetsInput): Promise<ListCategoryBudgetsOutput> {
    let categoryBudgets: CategoryBudget[];

    // Get by budget period if provided
    if (input.budgetPeriodId) {
      categoryBudgets = await this.categoryBudgetRepo.getByBudgetPeriodId(input.budgetPeriodId);
    }
    // Get by category if provided
    else if (input.categoryId) {
      categoryBudgets = await this.categoryBudgetRepo.getByCategoryId(input.categoryId);
    }
    // Get by user if provided
    else if (input.userId) {
      categoryBudgets = await this.categoryBudgetRepo.getByUserId(input.userId);
    }
    // No valid filter provided
    else {
      throw new Error('At least one filter parameter is required');
    }

    // Sort by percentage descending
    categoryBudgets.sort((a, b) => b.percentage - a.percentage);

    return {
      categoryBudgets,
    };
  }
}
