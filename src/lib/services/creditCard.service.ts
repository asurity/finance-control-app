// Credit Card Service - Complete credit card management
// Handles limits, cutoff dates, interest calculation, and statements

import { BaseService } from './base.service';
import { CreditCard, CreditCardStatement } from '@/types/firestore';
import { where, orderBy } from 'firebase/firestore';

export class CreditCardService extends BaseService<CreditCard> {
  constructor(orgId: string) {
    super(`organizations/${orgId}/creditCards`);
  }

  /**
   * Get all active credit cards
   */
  async getActiveCards(): Promise<CreditCard[]> {
    return this.query([where('isActive', '==', true)]);
  }

  /**
   * Get credit cards by account
   */
  async getByAccount(accountId: string): Promise<CreditCard[]> {
    return this.query([where('accountId', '==', accountId)]);
  }

  /**
   * Update credit card balance after a transaction
   * @param cardId - Credit card ID
   * @param amount - Transaction amount (positive for charges, negative for payments)
   */
  async updateBalance(cardId: string, amount: number): Promise<void> {
    const card = await this.getById(cardId);
    if (!card) throw new Error('Credit card not found');

    const newBalance = card.currentBalance + amount;
    const newAvailableCredit = card.creditLimit - newBalance;

    await this.update(cardId, {
      currentBalance: newBalance,
      availableCredit: newAvailableCredit,
      updatedAt: new Date(),
    });
  }

  /**
   * Calculate minimum payment for a credit card
   */
  async calculateMinimumPayment(cardId: string): Promise<number> {
    const card = await this.getById(cardId);
    if (!card) throw new Error('Credit card not found');

    return (card.currentBalance * card.minimumPaymentPercent) / 100;
  }

  /**
   * Calculate interest for current balance
   * @param cardId - Credit card ID
   * @returns Monthly interest amount
   */
  async calculateInterest(cardId: string): Promise<number> {
    const card = await this.getById(cardId);
    if (!card) throw new Error('Credit card not found');

    // Convert annual rate to monthly and calculate interest
    const monthlyRate = card.interestRate / 12 / 100;
    return card.currentBalance * monthlyRate;
  }

  /**
   * Get next cutoff date for a credit card
   */
  getNextCutoffDate(card: CreditCard): Date {
    const today = new Date();
    const cutoffDate = new Date(today.getFullYear(), today.getMonth(), card.cutoffDay);

    // If cutoff day already passed this month, get next month's cutoff
    if (today.getDate() >= card.cutoffDay) {
      cutoffDate.setMonth(cutoffDate.getMonth() + 1);
    }

    return cutoffDate;
  }

  /**
   * Get next payment due date for a credit card
   */
  getNextPaymentDueDate(card: CreditCard): Date {
    const today = new Date();
    const dueDate = new Date(today.getFullYear(), today.getMonth(), card.paymentDueDay);

    // If due day already passed this month, get next month's due date
    if (today.getDate() >= card.paymentDueDay) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    return dueDate;
  }

  /**
   * Check if credit card is approaching limit
   * @param cardId - Credit card ID
   * @param thresholdPercent - Percentage threshold (default 90%)
   * @returns True if usage is above threshold
   */
  async isApproachingLimit(cardId: string, thresholdPercent: number = 90): Promise<boolean> {
    const card = await this.getById(cardId);
    if (!card) return false;

    const usagePercent = (card.currentBalance / card.creditLimit) * 100;
    return usagePercent >= thresholdPercent;
  }

  /**
   * Get credit card utilization percentage
   */
  async getUtilizationPercent(cardId: string): Promise<number> {
    const card = await this.getById(cardId);
    if (!card) return 0;

    return (card.currentBalance / card.creditLimit) * 100;
  }
}

/**
 * Credit Card Statement Service
 * Handles monthly statements generation and payment tracking
 */
export class CreditCardStatementService extends BaseService<CreditCardStatement> {
  constructor(orgId: string) {
    super(`organizations/${orgId}/creditCardStatements`);
  }

  /**
   * Get statements by credit card
   */
  async getByCard(creditCardId: string): Promise<CreditCardStatement[]> {
    return this.query([where('creditCardId', '==', creditCardId), orderBy('statementDate', 'desc')]);
  }

  /**
   * Get unpaid statements for a credit card
   */
  async getUnpaidStatements(creditCardId: string): Promise<CreditCardStatement[]> {
    return this.query([
      where('creditCardId', '==', creditCardId),
      where('isPaid', '==', false),
      orderBy('dueDate', 'asc'),
    ]);
  }

  /**
   * Get upcoming statements (due in next N days)
   */
  async getUpcomingStatements(daysAhead: number = 7): Promise<CreditCardStatement[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const allUnpaid = await this.query([where('isPaid', '==', false), orderBy('dueDate', 'asc')]);

    return allUnpaid.filter((stmt) => {
      const dueDate = new Date(stmt.dueDate);
      return dueDate >= today && dueDate <= futureDate;
    });
  }

  /**
   * Mark statement as paid
   */
  async markAsPaid(statementId: string, paidAmount: number): Promise<void> {
    await this.update(statementId, {
      isPaid: true,
      paidDate: new Date(),
      paidAmount,
    });
  }

  /**
   * Generate a new statement for a credit card
   */
  async generateStatement(
    creditCardId: string,
    previousBalance: number,
    payments: number,
    purchases: number,
    interest: number
  ): Promise<string> {
    const currentBalance = previousBalance - payments + purchases + interest;
    const minimumPayment = currentBalance * 0.05; // 5% minimum payment

    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 15); // 15 days to pay

    const statement: Omit<CreditCardStatement, 'id'> = {
      creditCardId,
      statementDate: today,
      dueDate,
      previousBalance,
      payments,
      purchases,
      interest,
      currentBalance,
      minimumPayment,
      isPaid: false,
    };

    return this.create(statement);
  }
}
