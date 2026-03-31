import { BaseUseCase } from '../base/BaseUseCase';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { ICategoryBudgetRepository } from '@/domain/repositories/ICategoryBudgetRepository';
import { BudgetPeriod } from '@/domain/entities/BudgetPeriod';

/**
 * Input DTO for updating a budget period
 */
export interface UpdateBudgetPeriodInput {
  id: string;
  totalAmount?: number;
  startDate?: Date;
  endDate?: Date;
  name?: string;
  description?: string;
}

/**
 * Output for budget period update
 */
export interface UpdateBudgetPeriodOutput {
  budgetPeriod: BudgetPeriod;
}

/**
 * Use Case: Update Budget Period
 * Handles budget period updates with validation and category budget recalculation
 */
export class UpdateBudgetPeriodUseCase extends BaseUseCase<
  UpdateBudgetPeriodInput,
  UpdateBudgetPeriodOutput
> {
  constructor(
    private budgetPeriodRepo: IBudgetPeriodRepository,
    private categoryBudgetRepo: ICategoryBudgetRepository
  ) {
    super();
  }

  async execute(input: UpdateBudgetPeriodInput): Promise<UpdateBudgetPeriodOutput> {
    // Get existing budget period
    const existingBudgetPeriod = await this.budgetPeriodRepo.getById(input.id);
    if (!existingBudgetPeriod) {
      throw new Error('Budget period not found');
    }

    // Validate date changes if provided
    const newStartDate = input.startDate ?? existingBudgetPeriod.startDate;
    const newEndDate = input.endDate ?? existingBudgetPeriod.endDate;

    if (newStartDate >= newEndDate) {
      throw new Error('End date must be after start date');
    }

    // Check for overlapping budget periods (excluding current one)
    if (input.startDate || input.endDate) {
      const hasOverlap = await this.budgetPeriodRepo.hasOverlap(
        existingBudgetPeriod.userId,
        newStartDate,
        newEndDate,
        input.id
      );

      if (hasOverlap) {
        throw new Error('Budget period overlaps with an existing period');
      }
    }

    // Update budget period entity
    const updatedBudgetPeriod = existingBudgetPeriod.update({
      totalAmount: input.totalAmount,
      startDate: input.startDate,
      endDate: input.endDate,
      name: input.name,
      description: input.description,
    });

    // Save updated budget period
    await this.budgetPeriodRepo.update(input.id, updatedBudgetPeriod);

    // If total amount changed, recalculate all category budgets
    if (input.totalAmount && input.totalAmount !== existingBudgetPeriod.totalAmount) {
      await this.categoryBudgetRepo.recalculateAllocatedAmounts(input.id, input.totalAmount);
    }

    return {
      budgetPeriod: updatedBudgetPeriod,
    };
  }
}
