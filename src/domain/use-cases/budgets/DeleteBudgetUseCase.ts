import { BaseUseCase } from '../base/BaseUseCase';
import { IBudgetRepository } from '@/domain/repositories/IBudgetRepository';

/**
 * Input for deleting a budget
 */
export interface DeleteBudgetInput {
  budgetId: string;
}

/**
 * Output for budget deletion
 */
export interface DeleteBudgetOutput {
  success: boolean;
  message: string;
}

/**
 * Use Case: Delete Budget
 * Deletes a budget (safe operation, doesn't affect transactions)
 */
export class DeleteBudgetUseCase extends BaseUseCase<DeleteBudgetInput, DeleteBudgetOutput> {
  constructor(private budgetRepo: IBudgetRepository) {
    super();
  }

  async execute(input: DeleteBudgetInput): Promise<DeleteBudgetOutput> {
    // Verify budget exists
    const budget = await this.budgetRepo.getById(input.budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    // Delete budget (safe operation, doesn't cascade to transactions)
    await this.budgetRepo.delete(input.budgetId);

    return {
      success: true,
      message: `Budget "${budget.name}" deleted successfully`,
    };
  }
}
