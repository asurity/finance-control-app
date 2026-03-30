import { IRepository } from './IRepository';
import { BudgetPeriod } from '../entities/BudgetPeriod';

/**
 * Budget Period repository interface
 * 
 * Extends base repository with budget period-specific operations.
 */
export interface IBudgetPeriodRepository extends IRepository<BudgetPeriod> {
  /**
   * Gets budget periods by user ID
   * @param userId - User ID
   * @returns Promise resolving to array of budget periods
   */
  getByUserId(userId: string): Promise<BudgetPeriod[]>;

  /**
   * Gets budget periods by organization ID
   * @param organizationId - Organization ID
   * @returns Promise resolving to array of budget periods
   */
  getByOrganizationId(organizationId: string): Promise<BudgetPeriod[]>;

  /**
   * Gets active budget periods for a user
   * @param userId - User ID
   * @returns Promise resolving to array of active budget periods
   */
  getActiveByUserId(userId: string): Promise<BudgetPeriod[]>;

  /**
   * Gets budget period that contains a specific date
   * @param userId - User ID
   * @param date - Date to check
   * @returns Promise resolving to budget period or null if not found
   */
  getByDate(userId: string, date: Date): Promise<BudgetPeriod | null>;

  /**
   * Gets budget periods within a date range
   * @param userId - User ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Promise resolving to array of budget periods
   */
  getByDateRange(userId: string, startDate: Date, endDate: Date): Promise<BudgetPeriod[]>;

  /**
   * Checks if a budget period overlaps with existing periods for a user
   * @param userId - User ID
   * @param startDate - Start date
   * @param endDate - End date
   * @param excludeId - Budget period ID to exclude from check (for updates)
   * @returns Promise resolving to true if overlap exists
   */
  hasOverlap(
    userId: string,
    startDate: Date,
    endDate: Date,
    excludeId?: string
  ): Promise<boolean>;
}
