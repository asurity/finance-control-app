import { BaseUseCase } from '../base/BaseUseCase';
import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { IBudgetPeriodRepository } from '@/domain/repositories/IBudgetPeriodRepository';
import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { Transaction } from '@/types/firestore';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subWeeks, differenceInDays } from 'date-fns';

/**
 * Category Expense for Today
 */
export interface TodayCategoryExpense {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  color?: string;
}

/**
 * Daily and Weekly Statistics Output
 */
export interface DailyWeeklyStats {
  today: {
    totalExpenses: number;
    totalIncome: number;
    transactionCount: number;
    transactions: Transaction[];
    expensesByCategory: TodayCategoryExpense[];
  };
  thisWeek: {
    totalExpenses: number;
    totalIncome: number;
    transactionCount: number;
    dailyAverage: number;
    daysElapsed: number;
    transactions: Transaction[];
    expensesByCategory: TodayCategoryExpense[];
  };
  lastWeek: {
    totalExpenses: number;
    totalIncome: number;
  };
  dailyBudget: number | null;
  todayVsBudget: 'under' | 'over' | 'no-budget';
}

/**
 * Daily and Weekly Statistics Input
 */
export interface GetDailyWeeklyStatsInput {
  orgId: string;
  date: Date;
}

/**
 * Use Case: Get Daily and Weekly Statistics
 * Provides immediate visibility into today's and this week's spending
 */
export class GetDailyWeeklyStatsUseCase extends BaseUseCase<
  GetDailyWeeklyStatsInput,
  DailyWeeklyStats
> {
  constructor(
    private transactionRepo: ITransactionRepository,
    private budgetPeriodRepo: IBudgetPeriodRepository,
    private categoryRepo: ICategoryRepository
  ) {
    super();
  }

  async execute(input: GetDailyWeeklyStatsInput): Promise<DailyWeeklyStats> {
    const { orgId, date } = input;

    // Calculate date ranges
    const todayStart = startOfDay(date);
    const todayEnd = endOfDay(date);

    // Week starts on Monday (weekStartsOn: 1)
    const thisWeekStart = startOfWeek(date, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(date, { weekStartsOn: 1 });

    const lastWeekStart = startOfWeek(subWeeks(date, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(date, 1), { weekStartsOn: 1 });

    // Get transactions for each period
    const [todayTransactions, thisWeekTransactions, lastWeekTransactions] = await Promise.all([
      this.transactionRepo.getByDateRange(todayStart, todayEnd),
      this.transactionRepo.getByDateRange(thisWeekStart, thisWeekEnd),
      this.transactionRepo.getByDateRange(lastWeekStart, lastWeekEnd),
    ]);

    // Calculate today's stats
    const todayExpenses = todayTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const todayIncome = todayTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate expenses by category for today
    const todayExpenseTransactions = todayTransactions.filter((t) => t.type === 'EXPENSE');
    const categoryMap = new Map<string, { amount: number; count: number }>();

    for (const expense of todayExpenseTransactions) {
      if (!expense.categoryId) continue;

      const existing = categoryMap.get(expense.categoryId) ?? { amount: 0, count: 0 };
      categoryMap.set(expense.categoryId, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1,
      });
    }

    // Get category details
    const allCategories = await this.categoryRepo.getAll();
    const todayExpensesByCategory: TodayCategoryExpense[] = [];

    for (const [categoryId, data] of categoryMap.entries()) {
      const category = allCategories.find((c) => c.id === categoryId);
      if (!category) continue;

      todayExpensesByCategory.push({
        categoryId,
        categoryName: category.name,
        amount: data.amount,
        percentage: todayExpenses > 0 ? (data.amount / todayExpenses) * 100 : 0,
        transactionCount: data.count,
        color: category.color,
      });
    }

    // Sort by amount (descending)
    todayExpensesByCategory.sort((a, b) => b.amount - a.amount);

    // Calculate this week's stats
    const thisWeekExpenses = thisWeekTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const thisWeekIncome = thisWeekTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const daysElapsed = differenceInDays(date, thisWeekStart) + 1;
    const dailyAverage = daysElapsed > 0 ? thisWeekExpenses / daysElapsed : 0;

    // Calculate expenses by category for this week
    const thisWeekExpenseTransactions = thisWeekTransactions.filter((t) => t.type === 'EXPENSE');
    const weekCategoryMap = new Map<string, { amount: number; count: number }>();

    for (const expense of thisWeekExpenseTransactions) {
      if (!expense.categoryId) continue;

      const existing = weekCategoryMap.get(expense.categoryId) ?? { amount: 0, count: 0 };
      weekCategoryMap.set(expense.categoryId, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1,
      });
    }

    const thisWeekExpensesByCategory: TodayCategoryExpense[] = [];

    for (const [categoryId, data] of weekCategoryMap.entries()) {
      const category = allCategories.find((c) => c.id === categoryId);
      if (!category) continue;

      thisWeekExpensesByCategory.push({
        categoryId,
        categoryName: category.name,
        amount: data.amount,
        percentage: thisWeekExpenses > 0 ? (data.amount / thisWeekExpenses) * 100 : 0,
        transactionCount: data.count,
        color: category.color,
      });
    }

    // Sort by amount (descending)
    thisWeekExpensesByCategory.sort((a, b) => b.amount - a.amount);

    // Calculate last week's stats
    const lastWeekExpenses = lastWeekTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const lastWeekIncome = lastWeekTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    // Get active budget period to calculate daily budget
    // Note: Budget periods are user-specific, so we skip this for now
    // This will be enhanced in future versions to support org-wide budgets
    let dailyBudget: number | null = null;
    let todayVsBudget: 'under' | 'over' | 'no-budget' = 'no-budget';

    // TODO: Implement org-wide budget period lookup
    // For now, we always return no-budget status

    return {
      today: {
        totalExpenses: todayExpenses,
        totalIncome: todayIncome,
        transactionCount: todayTransactions.length,
        transactions: todayTransactions,
        expensesByCategory: todayExpensesByCategory,
      },
      thisWeek: {
        totalExpenses: thisWeekExpenses,
        totalIncome: thisWeekIncome,
        transactionCount: thisWeekTransactions.length,
        dailyAverage,
        daysElapsed,
        transactions: thisWeekTransactions,
        expensesByCategory: thisWeekExpensesByCategory,
      },
      lastWeek: {
        totalExpenses: lastWeekExpenses,
        totalIncome: lastWeekIncome,
      },
      dailyBudget,
      todayVsBudget,
    };
  }
}
