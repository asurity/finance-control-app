// Budget Service - Budget management and tracking
// Handles budget creation, monitoring, and spending analysis

import { BaseService } from './base.service';
import { Budget, BudgetPeriod } from '@/types/firestore';
import { where, orderBy } from 'firebase/firestore';
import { TransactionService } from './transaction.service';

export class BudgetService extends BaseService<Budget> {
  constructor(orgId: string) {
    super(`organizations/${orgId}/budgets`);
  }

  /**
   * Get budgets by category
   */
  async getByCategory(categoryId: string): Promise<Budget[]> {
    return this.query([where('categoryId', '==', categoryId), orderBy('startDate', 'desc')]);
  }

  /**
   * Get active budgets (within current date range)
   */
  async getActive(): Promise<Budget[]> {
    const now = new Date();
    const allBudgets = await this.getAll();

    return allBudgets.filter((budget) => {
      const start = new Date(budget.startDate);
      const end = new Date(budget.endDate);
      return now >= start && now <= end;
    });
  }

  /**
   * Get budgets by period
   */
  async getByPeriod(period: BudgetPeriod): Promise<Budget[]> {
    return this.query([where('period', '==', period)]);
  }

  /**
   * Calculate budget usage percentage
   */
  async calculateUsage(
    budgetId: string,
    transactionService: TransactionService
  ): Promise<{
    budget: Budget;
    spent: number;
    remaining: number;
    usagePercent: number;
  }> {
    const budget = await this.getById(budgetId);
    if (!budget) throw new Error('Budget not found');

    // Get transactions in budget period for the category
    const transactions = await transactionService.getByDateRange(
      new Date(budget.startDate),
      new Date(budget.endDate)
    );

    const categoryTransactions = transactions.filter(
      (t) => t.categoryId === budget.categoryId && t.type === 'EXPENSE'
    );

    const spent = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
    const remaining = Math.max(budget.amount - spent, 0);
    const usagePercent = (spent / budget.amount) * 100;

    return {
      budget,
      spent,
      remaining,
      usagePercent,
    };
  }

  /**
   * Get all budgets with usage information
   */
  async getAllWithUsage(transactionService: TransactionService): Promise<
    Array<{
      budget: Budget;
      spent: number;
      remaining: number;
      usagePercent: number;
    }>
  > {
    const budgets = await this.getActive();
    const usagePromises = budgets.map((budget) => this.calculateUsage(budget.id, transactionService));
    return Promise.all(usagePromises);
  }

  /**
   * Check if budget is exceeded
   */
  async isExceeded(budgetId: string, transactionService: TransactionService): Promise<boolean> {
    const usage = await this.calculateUsage(budgetId, transactionService);
    return usage.spent > usage.budget.amount;
  }

  /**
   * Check if budget is approaching limit
   */
  async isApproachingLimit(
    budgetId: string,
    transactionService: TransactionService,
    threshold: number = 80
  ): Promise<boolean> {
    const usage = await this.calculateUsage(budgetId, transactionService);
    return usage.usagePercent >= threshold;
  }

  /**
   * Get budgets exceeding threshold
   */
  async getBudgetsExceedingThreshold(
    transactionService: TransactionService,
    threshold: number = 80
  ): Promise<
    Array<{
      budget: Budget;
      spent: number;
      remaining: number;
      usagePercent: number;
    }>
  > {
    const allUsage = await this.getAllWithUsage(transactionService);
    return allUsage.filter((usage) => usage.usagePercent >= threshold);
  }

  /**
   * Create recurring budget (automatically creates next period)
   */
  async createRecurringBudget(
    name: string,
    amount: number,
    period: BudgetPeriod,
    categoryId: string
  ): Promise<string> {
    const startDate = new Date();
    const endDate = this.calculatePeriodEndDate(startDate, period);

    const budget: Omit<Budget, 'id'> = {
      name,
      amount,
      period,
      categoryId,
      startDate,
      endDate,
    };

    return this.create(budget);
  }

  /**
   * Calculate end date based on period
   */
  private calculatePeriodEndDate(startDate: Date, period: BudgetPeriod): Date {
    const endDate = new Date(startDate);

    switch (period) {
      case 'WEEKLY':
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'MONTHLY':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'QUARTERLY':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'YEARLY':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    endDate.setDate(endDate.getDate() - 1); // End one day before next period starts
    return endDate;
  }

  /**
   * Get budget summary for all categories
   */
  async getSummary(transactionService: TransactionService): Promise<{
    totalBudgeted: number;
    totalSpent: number;
    totalRemaining: number;
    overallUsagePercent: number;
  }> {
    const allUsage = await this.getAllWithUsage(transactionService);

    const totalBudgeted = allUsage.reduce((sum, u) => sum + u.budget.amount, 0);
    const totalSpent = allUsage.reduce((sum, u) => sum + u.spent, 0);
    const totalRemaining = totalBudgeted - totalSpent;
    const overallUsagePercent = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

    return {
      totalBudgeted,
      totalSpent,
      totalRemaining,
      overallUsagePercent,
    };
  }
}
