import { BaseUseCase } from '../base/BaseUseCase';
import { IBudgetRepository } from '@/domain/repositories/IBudgetRepository';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { Budget } from '@/types/firestore';

/**
 * Input for calculating budget usage
 */
export interface CalculateBudgetUsageInput {
  budgetId: string;
}

/**
 * Output for budget usage calculation
 */
export interface CalculateBudgetUsageOutput {
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  isExceeded: boolean;
}

/**
 * Use Case: Calculate Budget Usage
 * Calculates how much of a budget has been used based on transactions
 */
export class CalculateBudgetUsageUseCase extends BaseUseCase<
  CalculateBudgetUsageInput,
  CalculateBudgetUsageOutput
> {
  constructor(
    private budgetRepo: IBudgetRepository,
    private transactionRepo: ITransactionRepository
  ) {
    super();
  }

  async execute(input: CalculateBudgetUsageInput): Promise<CalculateBudgetUsageOutput> {
    // Get the budget
    const budget = await this.budgetRepo.getById(input.budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    // Get transactions for the budget period and category
    const transactions = await this.transactionRepo.getByDateRange(
      budget.startDate,
      budget.endDate
    );

    // Filter by category and type (only expenses)
    const categoryTransactions = transactions.filter(
      t => t.categoryId === budget.categoryId && t.type === 'EXPENSE'
    );

    // Calculate total spent
    const spentAmount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate remaining and percentage
    const remainingAmount = Math.max(0, budget.amount - spentAmount);
    const percentageUsed = (spentAmount / budget.amount) * 100;
    const isExceeded = spentAmount > budget.amount;

    return {
      budgetAmount: budget.amount,
      spentAmount,
      remainingAmount,
      percentageUsed,
      isExceeded,
    };
  }
}
