import { BaseUseCase } from '../base/BaseUseCase';
import { IBudgetRepository } from '@/domain/repositories/IBudgetRepository';
import { Budget } from '@/types/firestore';

/**
 * Input for creating a budget
 */
export interface CreateBudgetInput extends Omit<Budget, 'id'> {}

/**
 * Output for budget creation
 */
export interface CreateBudgetOutput {
  budgetId: string;
}

/**
 * Use Case: Create Budget
 * Creates a new budget for tracking expenses by category
 */
export class CreateBudgetUseCase extends BaseUseCase<CreateBudgetInput, CreateBudgetOutput> {
  constructor(private budgetRepo: IBudgetRepository) {
    super();
  }

  async execute(input: CreateBudgetInput): Promise<CreateBudgetOutput> {
    // Validate input
    this.validateInput(input);

    // Verify dates are correct
    if (input.endDate <= input.startDate) {
      throw new Error('End date must be after start date');
    }

    // Check for overlapping budgets
    const existingBudgets = await this.budgetRepo.getAll();
    const overlapping = existingBudgets.find(
      (budget) =>
        budget.categoryId === input.categoryId &&
        budget.period === input.period &&
        this.datesOverlap(input.startDate, input.endDate, budget.startDate, budget.endDate)
    );

    if (overlapping) {
      throw new Error(`A budget already exists for this category and period (${overlapping.name})`);
    }

    // Create budget
    const budgetId = await this.budgetRepo.create(input);

    return { budgetId };
  }

  private validateInput(input: CreateBudgetInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Budget name is required');
    }

    if (input.name.length > 100) {
      throw new Error('Budget name cannot exceed 100 characters');
    }

    if (input.amount <= 0) {
      throw new Error('Budget amount must be greater than 0');
    }

    if (!input.categoryId) {
      throw new Error('Category is required for budget');
    }

    if (!input.startDate || !input.endDate) {
      throw new Error('Start and end dates are required');
    }
  }

  private datesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 <= end2 && start2 <= end1;
  }
}
