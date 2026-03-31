import { IRepository } from './IRepository';
import { Transaction, TransactionType } from '@/types/firestore';

/**
 * Transaction repository interface
 *
 * Extends base repository with transaction-specific operations.
 */
export interface ITransactionRepository extends IRepository<Transaction> {
  /**
   * Gets transactions within a date range
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Promise resolving to array of transactions
   */
  getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]>;

  /**
   * Gets transactions by category
   * @param categoryId - Category ID
   * @returns Promise resolving to array of transactions
   */
  getByCategory(categoryId: string): Promise<Transaction[]>;

  /**
   * Gets transactions by account
   * @param accountId - Account ID
   * @returns Promise resolving to array of transactions
   */
  getByAccount(accountId: string): Promise<Transaction[]>;

  /**
   * Gets transactions by type (income or expense)
   * @param type - Transaction type
   * @returns Promise resolving to array of transactions
   */
  getByType(type: TransactionType): Promise<Transaction[]>;

  /**
   * Creates an installment transaction (generates multiple transactions)
   * @param data - Transaction data
   * @param installments - Number of installments
   * @returns Promise resolving to array of created transaction IDs
   */
  createInstallment(data: Omit<Transaction, 'id'>, installments: number): Promise<string[]>;

  /**
   * Gets all transactions belonging to an installment group
   * @param installmentGroupId - Installment group ID
   * @returns Promise resolving to array of transactions
   */
  getByInstallmentGroup(installmentGroupId: string): Promise<Transaction[]>;

  /**
   * Gets transaction statistics for a period
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Promise resolving to statistics object
   */
  getStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
    averageTransaction: number;
    topCategory: { categoryId: string; amount: number } | null;
  }>;

  /**
   * Gets transactions by user
   * @param userId - User ID
   * @returns Promise resolving to array of transactions
   */
  getByUser(userId: string): Promise<Transaction[]>;

  /**
   * Gets transactions by credit card
   * @param creditCardId - Credit card ID
   * @returns Promise resolving to array of transactions
   */
  getByCreditCard(creditCardId: string): Promise<Transaction[]>;

  /**
   * Gets transactions by tags
   * @param tags - Array of tags
   * @returns Promise resolving to array of transactions
   */
  getByTags(tags: string[]): Promise<Transaction[]>;
}
