import { IRepository } from './IRepository';
import { CreditCard, CreditCardStatement } from '@/types/firestore';

/**
 * Credit card repository interface
 * 
 * Extends base repository with credit card-specific operations.
 */
export interface ICreditCardRepository extends IRepository<CreditCard> {
  /**
   * Gets all active credit cards
   * @returns Promise resolving to array of active cards
   */
  getActive(): Promise<CreditCard[]>;

  /**
   * Gets credit cards by account
   * @param accountId - Account ID
   * @returns Promise resolving to array of credit cards
   */
  getByAccount(accountId: string): Promise<CreditCard[]>;

  /**
   * Updates credit card balance
   * @param creditCardId - Credit card ID
   * @param newBalance - New balance
   * @returns Promise resolving when update is complete
   */
  updateBalance(creditCardId: string, newBalance: number): Promise<void>;

  /**
   * Updates available credit
   * @param creditCardId - Credit card ID
   * @param availableCredit - New available credit
   * @returns Promise resolving when update is complete
   */
  updateAvailableCredit(creditCardId: string, availableCredit: number): Promise<void>;

  /**
   * Calculates minimum payment for current balance
   * @param creditCardId - Credit card ID
   * @returns Promise resolving to minimum payment amount
   */
  calculateMinimumPayment(creditCardId: string): Promise<number>;

  /**
   * Calculates interest for current balance
   * @param creditCardId - Credit card ID
   * @param days - Number of days (default: 30)
   * @returns Promise resolving to interest amount
   */
  calculateInterest(creditCardId: string, days?: number): Promise<number>;

  /**
   * Generates credit card statement
   * @param creditCardId - Credit card ID
   * @param statementDate - Statement date
   * @returns Promise resolving to statement ID
   */
  generateStatement(creditCardId: string, statementDate: Date): Promise<string>;

  /**
   * Gets statements for a credit card
   * @param creditCardId - Credit card ID
   * @returns Promise resolving to array of statements
   */
  getStatements(creditCardId: string): Promise<CreditCardStatement[]>;

  /**
   * Processes a credit card payment
   * @param creditCardId - Credit card ID
   * @param amount - Payment amount
   * @param accountId - Account ID for payment
   * @returns Promise resolving to transaction ID
   */
  processPayment(creditCardId: string, amount: number, accountId: string): Promise<string>;

  /**
   * Checks if credit limit is approaching
   * @param creditCardId - Credit card ID
   * @param thresholdPercent - Threshold percentage (default 90%)
   * @returns Promise resolving to true if approaching limit
   */
  isApproachingLimit(creditCardId: string, thresholdPercent?: number): Promise<boolean>;
}
