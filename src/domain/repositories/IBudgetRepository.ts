import { IRepository } from './IRepository';
import { Budget, BudgetPeriod } from '@/types/firestore';

/**
 * Budget repository interface
 * 
 * Extends base repository with budget-specific operations.
 */
export interface IBudgetRepository extends IRepository<Budget> {
  /**
   * Gets budgets by category
   * @param categoryId - Category ID
   * @returns Promise resolving to array of budgets
   */
  getByCategory(categoryId: string): Promise<Budget[]>;

  /**
   * Gets budgets by period
   * @param period - Budget period
   * @returns Promise resolving to array of budgets
   */
  getByPeriod(period: BudgetPeriod): Promise<Budget[]>;

  /**
   * Gets active budgets for current date
   * @param currentDate - Current date
   * @returns Promise resolving to array of active budgets
   */
  getActive(currentDate: Date): Promise<Budget[]>;

  /**
   * Gets budget usage (spent vs limit)
   * @param budgetId - Budget ID
   * @returns Promise resolving to usage object
   */
  getUsage(budgetId: string): Promise<{
    budgetAmount: number;
    spentAmount: number;
    remainingAmount: number;
    percentageUsed: number;
    isExceeded: boolean;
  }>;

  /**
   * Checks if budget is exceeded
   * @param budgetId - Budget ID
   * @returns Promise resolving to true if budget is exceeded
   */
  isExceeded(budgetId: string): Promise<boolean>;

  /**
   * Gets budget alerts (approaching limit or exceeded)
   * @param thresholdPercent - Alert threshold percentage (default 80%)
   * @returns Promise resolving to array of budgets needing alerts
   */
  getBudgetAlerts(thresholdPercent?: number): Promise<Budget[]>;

  /**
   * Gets budgets for a specific date range
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Promise resolving to array of budgets
   */
  getByDateRange(startDate: Date, endDate: Date): Promise<Budget[]>;
}
