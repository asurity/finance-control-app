import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { TransactionType } from '@/types/firestore';

/**
 * Input for getting transaction statistics
 */
export interface GetTransactionStatisticsInput {
  startDate: Date;
  endDate: Date;
  userId?: string;
}

/**
 * Category breakdown for statistics
 */
export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

/**
 * Output for transaction statistics
 */
export interface GetTransactionStatisticsOutput {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
  averageIncome: number;
  averageExpense: number;
  incomeByCategory: CategoryBreakdown[];
  expenseByCategory: CategoryBreakdown[];
  largestIncome: number;
  largestExpense: number;
  daysWithTransactions: number;
}

/**
 * Use Case: Get Transaction Statistics
 * Calculates comprehensive transaction statistics for a given date range
 */
export class GetTransactionStatisticsUseCase extends BaseUseCase<
  GetTransactionStatisticsInput,
  GetTransactionStatisticsOutput
> {
  constructor(
    private transactionRepo: ITransactionRepository,
    private categoryRepo: ICategoryRepository
  ) {
    super();
  }

  async execute(input: GetTransactionStatisticsInput): Promise<GetTransactionStatisticsOutput> {
    // Validate dates
    if (!(input.startDate instanceof Date) || isNaN(input.startDate.getTime())) {
      throw new Error('Invalid start date');
    }

    if (!(input.endDate instanceof Date) || isNaN(input.endDate.getTime())) {
      throw new Error('Invalid end date');
    }

    if (input.endDate < input.startDate) {
      throw new Error('End date must be after start date');
    }

    // Get transactions for date range
    const transactions = await this.transactionRepo.getByDateRange(input.startDate, input.endDate);

    // Filter by userId if provided
    const filteredTransactions = input.userId
      ? transactions.filter((t) => t.userId === input.userId)
      : transactions;

    // Get all categories for name mapping
    const categories = await this.categoryRepo.getAll();
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    // Calculate basic statistics
    let totalIncome = 0;
    let totalExpense = 0;
    let incomeCount = 0;
    let expenseCount = 0;
    let largestIncome = 0;
    let largestExpense = 0;

    // Category aggregations
    const incomeByCategory = new Map<string, { amount: number; count: number }>();
    const expenseByCategory = new Map<string, { amount: number; count: number }>();

    // Track unique days with transactions
    const uniqueDays = new Set<string>();

    // Process all transactions
    filteredTransactions.forEach((transaction) => {
      // Track unique days
      const transactionDate =
        transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
      const dayKey = transactionDate.toISOString().split('T')[0];
      uniqueDays.add(dayKey);

      if (transaction.type === 'INCOME') {
        totalIncome += transaction.amount;
        incomeCount++;
        largestIncome = Math.max(largestIncome, transaction.amount);

        // Aggregate by category
        const current = incomeByCategory.get(transaction.categoryId) || { amount: 0, count: 0 };
        incomeByCategory.set(transaction.categoryId, {
          amount: current.amount + transaction.amount,
          count: current.count + 1,
        });
      } else if (transaction.type === 'EXPENSE') {
        totalExpense += transaction.amount;
        expenseCount++;
        largestExpense = Math.max(largestExpense, transaction.amount);

        // Aggregate by category
        const current = expenseByCategory.get(transaction.categoryId) || { amount: 0, count: 0 };
        expenseByCategory.set(transaction.categoryId, {
          amount: current.amount + transaction.amount,
          count: current.count + 1,
        });
      }
    });

    // Calculate averages
    const averageIncome = incomeCount > 0 ? totalIncome / incomeCount : 0;
    const averageExpense = expenseCount > 0 ? totalExpense / expenseCount : 0;
    const netAmount = totalIncome - totalExpense;

    // Build category breakdowns
    const incomeBreakdown: CategoryBreakdown[] = Array.from(incomeByCategory.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: categoryMap.get(categoryId) || 'Unknown',
        amount: data.amount,
        percentage: totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    const expenseBreakdown: CategoryBreakdown[] = Array.from(expenseByCategory.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: categoryMap.get(categoryId) || 'Unknown',
        amount: data.amount,
        percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalIncome,
      totalExpense,
      netAmount,
      transactionCount: filteredTransactions.length,
      averageIncome,
      averageExpense,
      incomeByCategory: incomeBreakdown,
      expenseByCategory: expenseBreakdown,
      largestIncome,
      largestExpense,
      daysWithTransactions: uniqueDays.size,
    };
  }
}
