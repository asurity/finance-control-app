import { BaseUseCase } from '../base/BaseUseCase';
import { ICategoryBudgetRepository } from '@/domain/repositories/ICategoryBudgetRepository';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { CategoryBudget } from '@/domain/entities/CategoryBudget';

/**
 * Input DTO for setting a category budget
 */
export interface SetCategoryBudgetInput {
  budgetPeriodId: string;
  categoryId: string;
  percentage: number;
  userId: string;
  organizationId?: string | null;
}

/**
 * Output for category budget creation
 */
export interface SetCategoryBudgetOutput {
  categoryBudgetId: string;
  categoryBudget: CategoryBudget;
}

/**
 * Use Case: Set Category Budget
 * Handles category budget creation with percentage validation
 */
export class SetCategoryBudgetUseCase extends BaseUseCase<
  SetCategoryBudgetInput,
  SetCategoryBudgetOutput
> {
  constructor(
    private categoryBudgetRepo: ICategoryBudgetRepository,
    private budgetPeriodRepo: IBudgetPeriodRepository,
    private categoryRepo: ICategoryRepository
  ) {
    super();
  }

  async execute(input: SetCategoryBudgetInput): Promise<SetCategoryBudgetOutput> {
    // Validate budget period exists
    const budgetPeriod = await this.budgetPeriodRepo.getById(input.budgetPeriodId);
    if (!budgetPeriod) {
      throw new Error('Budget period not found');
    }

    // Validate user owns the budget period
    if (budgetPeriod.userId !== input.userId) {
      throw new Error('Unauthorized to modify this budget period');
    }

    // Validate category exists
    const categoryExists = await this.categoryRepo.exists(input.categoryId);
    if (!categoryExists) {
      throw new Error('Category not found');
    }

    // Validate percentage
    if (input.percentage < 0 || input.percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    // Check if category budget already exists
    const existingCategoryBudget = await this.categoryBudgetRepo.getByBudgetPeriodAndCategory(
      input.budgetPeriodId,
      input.categoryId
    );

    if (existingCategoryBudget) {
      throw new Error('Category budget already exists for this period. Use update instead.');
    }

    // Calculate total percentage including this new category
    const currentTotalPercentage = await this.categoryBudgetRepo.getTotalPercentage(
      input.budgetPeriodId
    );

    if (currentTotalPercentage + input.percentage > 100) {
      throw new Error(
        `Total percentage would exceed 100%. Current: ${currentTotalPercentage}%, Trying to add: ${input.percentage}%`
      );
    }

    // Calculate allocated amount
    const allocatedAmount = CategoryBudget.calculateAllocatedAmount(
      budgetPeriod.totalAmount,
      input.percentage
    );

    // Create category budget entity
    const categoryBudget = new CategoryBudget(
      '', // ID will be assigned by repository
      input.budgetPeriodId,
      input.categoryId,
      input.percentage,
      allocatedAmount,
      0, // Initial spent amount
      input.userId,
      input.organizationId ?? null,
      new Date(),
      new Date()
    );

    // Save to repository
    const categoryBudgetId = await this.categoryBudgetRepo.create(categoryBudget);

    // Retrieve the created category budget
    const createdCategoryBudget = await this.categoryBudgetRepo.getById(categoryBudgetId);
    if (!createdCategoryBudget) {
      throw new Error('Failed to retrieve created category budget');
    }

    return {
      categoryBudgetId,
      categoryBudget: createdCategoryBudget,
    };
  }
}
