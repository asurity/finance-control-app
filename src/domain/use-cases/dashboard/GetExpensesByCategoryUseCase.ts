/**
 * Use Case: Get Expenses By Category
 * Groups expenses by category for pie chart visualization
 */

import { ITransactionRepository } from '@/domain/repositories/ITransactionRepository';
import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
import { Transaction, Category } from '@/types/firestore';

export interface ExpensesByCategoryInput {
  userId: string;
  period: 'month' | 'quarter' | 'year';
}

export interface CategoryExpense {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  color?: string;
}

export interface ExpensesByCategoryOutput {
  categories: CategoryExpense[];
  totalExpenses: number;
  topCategory: CategoryExpense | null;
}

export class GetExpensesByCategoryUseCase {
  constructor(
    private transactionRepository: ITransactionRepository,
    private categoryRepository: ICategoryRepository
  ) {}

  async execute(input: ExpensesByCategoryInput): Promise<ExpensesByCategoryOutput> {
    const { userId, period } = input;

    // Calculate date range
    const { startDate, endDate } = this.calculateDateRange(period);

    // Get transactions by date range from the organization (not filtered by user)
    // This ensures multi-user organizations see consolidated data
    // Using getByDateRange instead of getAll + filter for better performance and accuracy
    const allTransactions = await this.transactionRepository.getByDateRange(startDate, endDate);
    const expenses = allTransactions.filter((tx) => tx.type === 'EXPENSE');

    const totalExpenses = expenses.reduce((sum: number, tx) => sum + tx.amount, 0);

    // Group by category
    const categoryMap = new Map<string, { amount: number; count: number }>();
    
    for (const expense of expenses) {
      if (!expense.categoryId) continue;
      
      const existing = categoryMap.get(expense.categoryId) ?? { amount: 0, count: 0 };
      categoryMap.set(expense.categoryId, {
        amount: existing.amount + expense.amount,
        count: existing.count + 1,
      });
    }

    // Get category details from the organization
    const allCategories = await this.categoryRepository.getAll();
    const categories: CategoryExpense[] = [];

    for (const [categoryId, data] of categoryMap.entries()) {
      const category = allCategories.find((c) => c.id === categoryId);
      if (!category) continue;

      categories.push({
        categoryId,
        categoryName: category.name,
        amount: data.amount,
        percentage: totalExpenses > 0 ? (data.amount / totalExpenses) * 100 : 0,
        transactionCount: data.count,
        color: category.color,
      });
    }

    // Sort by amount (descending)
    categories.sort((a, b) => b.amount - a.amount);

    // Get top category
    const topCategory = categories.length > 0 ? categories[0] : null;

    return {
      categories,
      totalExpenses,
      topCategory,
    };
  }

  private calculateDateRange(period: 'month' | 'quarter' | 'year'): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    const startDate = new Date(now);

    switch (period) {
      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'quarter':
        const currentMonth = startDate.getMonth();
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        startDate.setMonth(quarterStartMonth);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate.setMonth(0);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }
}
