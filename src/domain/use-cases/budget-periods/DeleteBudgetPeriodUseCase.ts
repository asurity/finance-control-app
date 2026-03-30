import { BaseUseCase } from '../base/BaseUseCase';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { ICategoryBudgetRepository } from '@/domain/repositories/ICategoryBudgetRepository';

/**
 * Input DTO for deleting a budget period
 */
export interface DeleteBudgetPeriodInput {
  id: string;
  userId: string;
}

/**
 * Output for budget period deletion
 */
export interface DeleteBudgetPeriodOutput {
  success: boolean;
}

/**
 * Use Case: Delete Budget Period
 * Handles budget period deletion including all associated category budgets
 */
export class DeleteBudgetPeriodUseCase extends BaseUseCase<
  DeleteBudgetPeriodInput,
  DeleteBudgetPeriodOutput
> {
  constructor(
    private budgetPeriodRepo: IBudgetPeriodRepository,
    private categoryBudgetRepo: ICategoryBudgetRepository
  ) {
    super();
  }

  async execute(input: DeleteBudgetPeriodInput): Promise<DeleteBudgetPeriodOutput> {
    // Verify budget period exists and belongs to user
    const budgetPeriod = await this.budgetPeriodRepo.getById(input.id);
    if (!budgetPeriod) {
      throw new Error('Budget period not found');
    }

    if (budgetPeriod.userId !== input.userId) {
      throw new Error('Unauthorized to delete this budget period');
    }

    // Delete all associated category budgets first
    await this.categoryBudgetRepo.deleteByBudgetPeriodId(input.id);

    // Delete the budget period
    await this.budgetPeriodRepo.delete(input.id);

    return {
      success: true,
    };
  }
}
