import { BaseUseCase } from '../base/BaseUseCase';
import { IBudgetRepository } from '@/domain/repositories/IBudgetRepository';
import { Budget } from '@/types/firestore';

/**
 * Input for updating a budget
 */
export interface UpdateBudgetInput {
  id: string;
  data: Partial<Omit<Budget, 'id'>>;
}

/**
 * Output for budget update
 */
export interface UpdateBudgetOutput {
  budgetId: string;
}

/**
 * Use Case: Update Budget
 * Updates budget information (amount, period, dates, etc.)
 */
export class UpdateBudgetUseCase extends BaseUseCase<
  UpdateBudgetInput,
  UpdateBudgetOutput
> {
  constructor(private budgetRepo: IBudgetRepository) {
    super();
  }

  async execute(input: UpdateBudgetInput): Promise<UpdateBudgetOutput> {
    // Verify budget exists
    const budget = await this.budgetRepo.getById(input.id);
    if (!budget) {
      throw new Error('Budget not found');
    }

    // Validate update data
    this.validateInput(input.data);

    // Check date consistency if both are being updated
    const newStartDate = input.data.startDate || budget.startDate;
    const newEndDate = input.data.endDate || budget.endDate;

    if (newEndDate <= newStartDate) {
      throw new Error('End date must be after start date');
    }

    // Update budget
    await this.budgetRepo.update(input.id, input.data);

    return { budgetId: input.id };
  }

  private validateInput(data: Partial<Budget>): void {
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Budget name cannot be empty');
      }
      if (data.name.length > 100) {
        throw new Error('Budget name cannot exceed 100 characters');
      }
    }

    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error('Budget amount must be greater than 0');
    }
  }
}
