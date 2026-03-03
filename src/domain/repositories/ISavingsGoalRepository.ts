import { IRepository } from './IRepository';
import { SavingsGoal, SavingsGoalStatus, SavingsGoalContribution } from '@/types/firestore';

/**
 * Savings goal repository interface
 * 
 * Extends base repository with savings goal-specific operations.
 */
export interface ISavingsGoalRepository extends IRepository<SavingsGoal> {
  /**
   * Gets all active savings goals
   * @returns Promise resolving to array of active goals
   */
  getActive(): Promise<SavingsGoal[]>;

  /**
   * Gets savings goals by status
   * @param status - Goal status
   * @returns Promise resolving to array of goals
   */
  getByStatus(status: SavingsGoalStatus): Promise<SavingsGoal[]>;

  /**
   * Gets savings goals by user
   * @param userId - User ID
   * @returns Promise resolving to array of goals
   */
  getByUser(userId: string): Promise<SavingsGoal[]>;

  /**
   * Adds contribution to a savings goal
   * @param goalId - Savings goal ID
   * @param amount - Contribution amount
   * @param transactionId - Optional transaction ID
   * @param note - Optional note
   * @returns Promise resolving to contribution ID
   */
  addContribution(
    goalId: string,
    amount: number,
    transactionId?: string,
    note?: string
  ): Promise<string>;

  /**
   * Gets contributions for a savings goal
   * @param goalId - Savings goal ID
   * @returns Promise resolving to array of contributions
   */
  getContributions(goalId: string): Promise<SavingsGoalContribution[]>;

  /**
   * Updates goal progress
   * @param goalId - Savings goal ID
   * @param newAmount - New current amount
   * @returns Promise resolving when update is complete
   */
  updateProgress(goalId: string, newAmount: number): Promise<void>;

  /**
   * Marks goal as completed
   * @param goalId - Savings goal ID
   * @returns Promise resolving when update is complete
   */
  complete(goalId: string): Promise<void>;

  /**
   * Cancels a savings goal
   * @param goalId - Savings goal ID
   * @returns Promise resolving when update is complete
   */
  cancel(goalId: string): Promise<void>;

  /**
   * Gets goal progress percentage
   * @param goalId - Savings goal ID
   * @returns Promise resolving to progress percentage
   */
  getProgressPercent(goalId: string): Promise<number>;

  /**
   * Gets goals approaching target date
   * @param daysThreshold - Days before target date (default: 30)
   * @returns Promise resolving to array of goals
   */
  getApproachingDeadline(daysThreshold?: number): Promise<SavingsGoal[]>;

  /**
   * Gets total savings across all active goals
   * @param userId - User ID
   * @returns Promise resolving to total amount
   */
  getTotalSavings(userId: string): Promise<number>;
}
