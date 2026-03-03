import { IRepository } from './IRepository';
import { Account, AccountType } from '@/types/firestore';

/**
 * Account repository interface
 * 
 * Extends base repository with account-specific operations.
 */
export interface IAccountRepository extends IRepository<Account> {
  /**
   * Gets all active accounts
   * @returns Promise resolving to array of active accounts
   */
  getActive(): Promise<Account[]>;

  /**
   * Gets accounts by type
   * @param type - Account type
   * @returns Promise resolving to array of accounts
   */
  getByType(type: AccountType): Promise<Account[]>;

  /**
   * Updates account balance
   * @param accountId - Account ID
   * @param newBalance - New balance amount
   * @returns Promise resolving when update is complete
   */
  updateBalance(accountId: string, newBalance: number): Promise<void>;

  /**
   * Transfers money between accounts
   * @param fromAccountId - Source account ID
   * @param toAccountId - Destination account ID
   * @param amount - Amount to transfer
   * @param description - Transfer description
   * @returns Promise resolving to transaction IDs [fromTransaction, toTransaction]
   */
  transfer(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description: string
  ): Promise<[string, string]>;

  /**
   * Calculates net worth across all accounts
   * @returns Promise resolving to total net worth
   */
  getNetWorth(): Promise<number>;

  /**
   * Gets account balance history for a period
   * @param accountId - Account ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Promise resolving to array of balance snapshots
   */
  getBalanceHistory(
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ date: Date; balance: number }>>;

  /**
   * Deactivates an account
   * @param accountId - Account ID
   * @returns Promise resolving when deactivation is complete
   */
  deactivate(accountId: string): Promise<void>;

  /**
   * Reactivates an account
   * @param accountId - Account ID
   * @returns Promise resolving when reactivation is complete
   */
  reactivate(accountId: string): Promise<void>;
}
