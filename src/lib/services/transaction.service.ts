// Transaction Service - Enhanced with installments and credit card support
// Handles all transaction operations including installment payments

import { BaseService } from './base.service';
import { Transaction } from '@/types/firestore';
import { where, orderBy, Timestamp } from 'firebase/firestore';

export class TransactionService extends BaseService<Transaction> {
  constructor(orgId: string) {
    super(`organizations/${orgId}/transactions`);
  }

  /**
   * Get transactions within a date range
   */
  async getByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    return this.query([
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc'),
    ]);
  }

  /**
   * Get transactions by category
   */
  async getByCategory(categoryId: string): Promise<Transaction[]> {
    return this.query([where('categoryId', '==', categoryId), orderBy('date', 'desc')]);
  }

  /**
   * Get transactions by account
   */
  async getByAccount(accountId: string): Promise<Transaction[]> {
    return this.query([where('accountId', '==', accountId), orderBy('date', 'desc')]);
  }

  /**
   * Get transactions by user (who created them)
   */
  async getByUser(userId: string): Promise<Transaction[]> {
    return this.query([where('userId', '==', userId), orderBy('date', 'desc')]);
  }

  /**
   * Get all installments for a specific installment group
   */
  async getInstallmentsByGroup(installmentGroupId: string): Promise<Transaction[]> {
    return this.query([
      where('installmentGroupId', '==', installmentGroupId),
      orderBy('installmentNumber', 'asc'),
    ]);
  }

  /**
   * Get transactions paid with a specific credit card
   */
  async getByCreditCard(creditCardId: string): Promise<Transaction[]> {
    return this.query([where('creditCardId', '==', creditCardId), orderBy('date', 'desc')]);
  }

  /**
   * Get recurring transactions
   */
  async getRecurringTransactions(): Promise<Transaction[]> {
    return this.query([where('isRecurring', '==', true), orderBy('date', 'desc')]);
  }

  /**
   * Get transactions by recurring transaction ID
   */
  async getByRecurringTransaction(recurringTransactionId: string): Promise<Transaction[]> {
    return this.query([
      where('recurringTransactionId', '==', recurringTransactionId),
      orderBy('date', 'desc'),
    ]);
  }

  /**
   * Create an installment transaction (generates all installments)
   * @param baseTransaction - The base transaction data
   * @param totalInstallments - Number of installments to create
   * @returns Array of created transaction IDs
   */
  async createInstallmentTransaction(
    baseTransaction: Omit<Transaction, 'id'>,
    totalInstallments: number
  ): Promise<string[]> {
    const installmentGroupId = `installment_${Date.now()}`;
    const installmentAmount = baseTransaction.amount / totalInstallments;
    const transactionIds: string[] = [];

    for (let i = 1; i <= totalInstallments; i++) {
      const installmentDate = new Date(baseTransaction.date);
      installmentDate.setMonth(installmentDate.getMonth() + (i - 1));

      const installmentTransaction: Omit<Transaction, 'id'> = {
        ...baseTransaction,
        amount: installmentAmount,
        description: `${baseTransaction.description} (Cuota ${i}/${totalInstallments})`,
        isInstallment: true,
        installmentNumber: i,
        totalInstallments,
        installmentGroupId,
        date: installmentDate,
      };

      const id = await this.create(installmentTransaction);
      transactionIds.push(id);
    }

    return transactionIds;
  }

  /**
   * Get transaction statistics for a date range
   */
  async getStatistics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
  }> {
    const transactions = await this.getByDateRange(startDate, endDate);

    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactionCount: transactions.length,
    };
  }
}
