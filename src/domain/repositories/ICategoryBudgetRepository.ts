import { IRepository } from './IRepository';
import { CategoryBudget } from '../entities/CategoryBudget';

/**
 * Category Budget repository interface
 *
 * Extends base repository with category budget-specific operations.
 */
export interface ICategoryBudgetRepository extends IRepository<CategoryBudget> {
  /**
   * Gets category budgets by budget period ID
   * @param budgetPeriodId - Budget period ID
   * @returns Promise resolving to array of category budgets
   */
  getByBudgetPeriodId(budgetPeriodId: string): Promise<CategoryBudget[]>;

  /**
   * Gets a specific category budget by budget period and category
   * @param budgetPeriodId - Budget period ID
   * @param categoryId - Category ID
   * @returns Promise resolving to category budget or null if not found
   */
  getByBudgetPeriodAndCategory(
    budgetPeriodId: string,
    categoryId: string
  ): Promise<CategoryBudget | null>;

  /**
   * Gets category budgets by category ID across all budget periods
   * @param categoryId - Category ID
   * @returns Promise resolving to array of category budgets
   */
  getByCategoryId(categoryId: string): Promise<CategoryBudget[]>;

  /**
   * Gets category budgets by user ID
   * @param userId - User ID
   * @returns Promise resolving to array of category budgets
   */
  getByUserId(userId: string): Promise<CategoryBudget[]>;

  /**
   * Updates the spent amount for a category budget
   * @param id - Category budget ID
   * @param spentAmount - New spent amount
   * @returns Promise resolving when update is complete
   */
  updateSpentAmount(id: string, spentAmount: number): Promise<void>;

  /**
   * Increments the spent amount for a category budget
   * @param id - Category budget ID
   * @param amount - Amount to add to spent amount
   * @returns Promise resolving when update is complete
   */
  incrementSpentAmount(id: string, amount: number): Promise<void>;

  /**
   * Decrements the spent amount for a category budget
   * @param id - Category budget ID
   * @param amount - Amount to subtract from spent amount
   * @returns Promise resolving when update is complete
   */
  decrementSpentAmount(id: string, amount: number): Promise<void>;

  /**
   * Validates that the sum of percentages does not exceed 100%
   * @param budgetPeriodId - Budget period ID
   * @param excludeId - Category budget ID to exclude from calculation (for updates)
   * @returns Promise resolving to total percentage
   */
  getTotalPercentage(budgetPeriodId: string, excludeId?: string): Promise<number>;

  /**
   * Deletes all category budgets for a budget period
   * @param budgetPeriodId - Budget period ID
   * @returns Promise resolving when deletion is complete
   */
  deleteByBudgetPeriodId(budgetPeriodId: string): Promise<void>;

  /**
   * Recalculates allocated amounts for all categories in a budget period
   * @param budgetPeriodId - Budget period ID
   * @param newTotalAmount - New total budget amount
   * @returns Promise resolving when update is complete
   */
  recalculateAllocatedAmounts(budgetPeriodId: string, newTotalAmount: number): Promise<void>;

  /**
   * Updates a category budget with optimistic locking
   * @param id - Category budget ID
   * @param categoryBudget - Updated category budget data
   * @returns Promise resolving when update is complete
   */
  updateWithOptimisticLock(id: string, categoryBudget: Partial<CategoryBudget>): Promise<void>;
}
