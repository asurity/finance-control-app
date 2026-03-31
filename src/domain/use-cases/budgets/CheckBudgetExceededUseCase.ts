import { BaseUseCase } from '../base/BaseUseCase';
import { IBudgetRepository } from '@/domain/repositories/IBudgetRepository';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';

/**
 * Input for checking if budget is exceeded
 */
export interface CheckBudgetExceededInput {
  budgetId: string;
}

/**
 * Output with budget status
 */
export interface CheckBudgetExceededOutput {
  isExceeded: boolean;
  budgetAmount: number;
  currentSpending: number;
  remainingAmount: number;
  percentageUsed: number;
  daysRemaining: number;
}

/**
 * Use Case: Check Budget Exceeded
 * Checks if a budget has been exceeded and provides usage statistics
 */
export class CheckBudgetExceededUseCase extends BaseUseCase<
  CheckBudgetExceededInput,
  CheckBudgetExceededOutput
> {
  constructor(
    private budgetRepo: IBudgetRepository,
    private transactionRepo: ITransactionRepository
  ) {
    super();
  }

  async execute(input: CheckBudgetExceededInput): Promise<CheckBudgetExceededOutput> {
    // Get budget
    const budget = await this.budgetRepo.getById(input.budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }

    // Get transactions for this budget's category and period
    const transactions = await this.transactionRepo.getAll({
      categoryId: budget.categoryId,
      type: 'EXPENSE',
    });

    // Filter transactions within budget period
    const relevantTransactions = transactions.filter(
      (t) => t.date >= budget.startDate && t.date <= budget.endDate
    );

    // Calculate current spending
    const currentSpending = relevantTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Calculate remaining amount
    const remainingAmount = budget.amount - currentSpending;

    // Calculate percentage used
    const percentageUsed = (currentSpending / budget.amount) * 100;

    // Calculate days remaining
    const today = new Date();
    const endDate = new Date(budget.endDate);
    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Determine if exceeded
    const isExceeded = currentSpending > budget.amount;

    return {
      isExceeded,
      budgetAmount: budget.amount,
      currentSpending,
      remainingAmount,
      percentageUsed: Math.round(percentageUsed * 100) / 100, // Round to 2 decimals
      daysRemaining,
    };
  }
}
