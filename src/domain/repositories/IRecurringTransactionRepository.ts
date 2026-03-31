import { IRepository } from './IRepository';
import { RecurringTransaction, RecurrenceFrequency } from '@/types/firestore';

/**
 * Recurring transaction repository interface
 *
 * Extends base repository with recurring transaction-specific operations.
 */
export interface IRecurringTransactionRepository extends IRepository<RecurringTransaction> {
  /**
   * Gets all active recurring transactions
   * @returns Promise resolving to array of active recurring transactions
   */
  getActive(): Promise<RecurringTransaction[]>;

  /**
   * Gets recurring transactions by frequency
   * @param frequency - Recurrence frequency
   * @returns Promise resolving to array of recurring transactions
   */
  getByFrequency(frequency: RecurrenceFrequency): Promise<RecurringTransaction[]>;

  /**
   * Gets recurring transactions by account
   * @param accountId - Account ID
   * @returns Promise resolving to array of recurring transactions
   */
  getByAccount(accountId: string): Promise<RecurringTransaction[]>;

  /**
   * Gets recurring transactions by category
   * @param categoryId - Category ID
   * @returns Promise resolving to array of recurring transactions
   */
  getByCategory(categoryId: string): Promise<RecurringTransaction[]>;

  /**
   * Gets recurring transactions due for processing
   * @param currentDate - Current date
   * @returns Promise resolving to array of recurring transactions to process
   */
  getDueForProcessing(currentDate: Date): Promise<RecurringTransaction[]>;

  /**
   * Processes a recurring transaction (creates actual transaction)
   * @param recurringTransactionId - Recurring transaction ID
   * @returns Promise resolving to created transaction ID
   */
  process(recurringTransactionId: string): Promise<string>;

  /**
   * Updates next occurrence date
   * @param recurringTransactionId - Recurring transaction ID
   * @param nextDate - Next occurrence date
   * @returns Promise resolving when update is complete
   */
  updateNextOccurrence(recurringTransactionId: string, nextDate: Date): Promise<void>;

  /**
   * Cancels a recurring transaction
   * @param recurringTransactionId - Recurring transaction ID
   * @returns Promise resolving when cancellation is complete
   */
  cancel(recurringTransactionId: string): Promise<void>;

  /**
   * Gets all transactions created from a recurring transaction
   * @param recurringTransactionId - Recurring transaction ID
   * @returns Promise resolving to array of transaction IDs
   */
  getGeneratedTransactions(recurringTransactionId: string): Promise<string[]>;
}
