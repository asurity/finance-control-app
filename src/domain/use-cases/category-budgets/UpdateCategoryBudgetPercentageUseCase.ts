import { BaseUseCase } from '../base/BaseUseCase';
import { ICategoryBudgetRepository } from '@/domain/repositories/ICategoryBudgetRepository';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { CategoryBudget } from '@/domain/entities/CategoryBudget';

/**
 * Input DTO for updating a category budget percentage
 */
export interface UpdateCategoryBudgetPercentageInput {
  id: string;
  percentage: number;
  userId: string;
}

/**
 * Output for category budget update
 */
export interface UpdateCategoryBudgetPercentageOutput {
  categoryBudget: CategoryBudget;
}

/**
 * Use Case: Update Category Budget Percentage
 * Handles percentage updates with validation and automatic recalculation
 */
export class UpdateCategoryBudgetPercentageUseCase extends BaseUseCase<
  UpdateCategoryBudgetPercentageInput,
  UpdateCategoryBudgetPercentageOutput
> {
  constructor(
    private categoryBudgetRepo: ICategoryBudgetRepository,
    private budgetPeriodRepo: IBudgetPeriodRepository
  ) {
    super();
  }

  async execute(
    input: UpdateCategoryBudgetPercentageInput
  ): Promise<UpdateCategoryBudgetPercentageOutput> {
    // Get existing category budget
    const existingCategoryBudget = await this.categoryBudgetRepo.getById(input.id);
    if (!existingCategoryBudget) {
      throw new Error('Category budget not found');
    }

    // Validate user owns the category budget
    if (existingCategoryBudget.userId !== input.userId) {
      throw new Error('Unauthorized to modify this category budget');
    }

    // Validate percentage
    if (input.percentage < 0 || input.percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    // Calculate total percentage including this update (excluding current value)
    const currentTotalPercentage = await this.categoryBudgetRepo.getTotalPercentage(
      existingCategoryBudget.budgetPeriodId,
      input.id
    );

    if (currentTotalPercentage + input.percentage > 100) {
      throw new Error(
        `Total percentage would exceed 100%. Current (excluding this): ${currentTotalPercentage}%, Trying to set: ${input.percentage}%`
      );
    }

    // Get budget period for total amount
    const budgetPeriod = await this.budgetPeriodRepo.getById(
      existingCategoryBudget.budgetPeriodId
    );
    if (!budgetPeriod) {
      throw new Error('Budget period not found');
    }

    // Update percentage and recalculate allocated amount
    const updatedCategoryBudget = existingCategoryBudget.updatePercentage(
      input.percentage,
      budgetPeriod.totalAmount
    );

    // Save updated category budget
    await this.categoryBudgetRepo.update(input.id, updatedCategoryBudget);

    return {
      categoryBudget: updatedCategoryBudget,
    };
  }
}
