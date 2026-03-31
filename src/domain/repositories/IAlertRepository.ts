import { IRepository } from './IRepository';
import { Alert, AlertType, AlertPriority } from '@/types/firestore';

/**
 * Alert repository interface
 *
 * Extends base repository with alert-specific operations.
 */
export interface IAlertRepository extends IRepository<Alert> {
  /**
   * Gets all unread alerts
   * @returns Promise resolving to array of unread alerts
   */
  getUnread(): Promise<Alert[]>;

  /**
   * Gets alerts by type
   * @param type - Alert type
   * @returns Promise resolving to array of alerts
   */
  getByType(type: AlertType): Promise<Alert[]>;

  /**
   * Gets alerts by priority
   * @param priority - Alert priority
   * @returns Promise resolving to array of alerts
   */
  getByPriority(priority: AlertPriority): Promise<Alert[]>;

  /**
   * Gets alerts for a specific user
   * @param userId - User ID
   * @returns Promise resolving to array of alerts
   */
  getByUser(userId: string): Promise<Alert[]>;

  /**
   * Marks an alert as read
   * @param alertId - Alert ID
   * @returns Promise resolving when update is complete
   */
  markAsRead(alertId: string): Promise<void>;

  /**
   * Marks multiple alerts as read
   * @param alertIds - Array of alert IDs
   * @returns Promise resolving when update is complete
   */
  markMultipleAsRead(alertIds: string[]): Promise<void>;

  /**
   * Archives an alert
   * @param alertId - Alert ID
   * @returns Promise resolving when update is complete
   */
  archive(alertId: string): Promise<void>;

  /**
   * Gets archived alerts
   * @returns Promise resolving to array of archived alerts
   */
  getArchived(): Promise<Alert[]>;

  /**
   * Creates a budget threshold alert
   * @param budgetId - Budget ID
   * @param userId - User ID
   * @param budgetName - Budget name
   * @param percentUsed - Percentage used
   * @returns Promise resolving to created alert ID
   */
  createBudgetAlert(
    budgetId: string,
    userId: string,
    budgetName: string,
    percentUsed: number
  ): Promise<string>;

  /**
   * Creates a payment due alert
   * @param entityId - Entity ID (transaction, credit card, etc.)
   * @param userId - User ID
   * @param dueDate - Due date
   * @param amount - Payment amount
   * @returns Promise resolving to created alert ID
   */
  createPaymentDueAlert(
    entityId: string,
    userId: string,
    dueDate: Date,
    amount: number
  ): Promise<string>;

  /**
   * Creates a low balance alert
   * @param accountId - Account ID
   * @param userId - User ID
   * @param accountName - Account name
   * @param currentBalance - Current balance
   * @returns Promise resolving to created alert ID
   */
  createLowBalanceAlert(
    accountId: string,
    userId: string,
    accountName: string,
    currentBalance: number
  ): Promise<string>;

  /**
   * Gets active alerts count by priority
   * @param userId - User ID
   * @returns Promise resolving to count object
   */
  getCountByPriority(userId: string): Promise<{
    urgent: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  }>;
}
