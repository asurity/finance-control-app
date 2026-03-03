// Recurring Transaction Service - Automated periodic transactions
// Handles creation, processing, and management of recurring transactions

import { BaseService } from './base.service';
import { RecurringTransaction, Transaction } from '@/types/firestore';
import { where, orderBy } from 'firebase/firestore';
import { TransactionService } from './transaction.service';

export class RecurringTransactionService extends BaseService<RecurringTransaction> {
  constructor(orgId: string) {
    super(`organizations/${orgId}/recurringTransactions`);
  }

  /**
   * Get all active recurring transactions
   */
  async getActive(): Promise<RecurringTransaction[]> {
    return this.query([where('isActive', '==', true)]);
  }

  /**
   * Get recurring transactions by user
   */
  async getByUser(userId: string): Promise<RecurringTransaction[]> {
    return this.query([where('userId', '==', userId), orderBy('nextOccurrence', 'asc')]);
  }

  /**
   * Get recurring transactions by category
   */
  async getByCategory(categoryId: string): Promise<RecurringTransaction[]> {
    return this.query([where('categoryId', '==', categoryId)]);
  }

  /**
   * Get recurring transactions due today or earlier
   */
  async getDueTransactions(): Promise<RecurringTransaction[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    const active = await this.getActive();
    return active.filter((rt) => {
      const nextDate = new Date(rt.nextOccurrence);
      return nextDate <= today;
    });
  }

  /**
   * Process a recurring transaction (create actual transaction)
   * @param recurringId - Recurring transaction ID
   * @param transactionService - Transaction service instance
   * @returns Created transaction ID
   */
  async processRecurringTransaction(
    recurringId: string,
    transactionService: TransactionService
  ): Promise<string> {
    const recurring = await this.getById(recurringId);
    if (!recurring) throw new Error('Recurring transaction not found');

    // Create the actual transaction
    const transaction: Omit<Transaction, 'id'> = {
      description: recurring.description,
      amount: recurring.amount,
      type: recurring.type,
      date: new Date(),
      accountId: recurring.accountId,
      categoryId: recurring.categoryId,
      userId: recurring.userId,
      tags: recurring.tags,
      isRecurring: true,
      recurringTransactionId: recurringId,
    };

    const transactionId = await transactionService.create(transaction);

    // Update recurring transaction
    const nextOccurrence = this.calculateNextOccurrence(recurring);
    await this.update(recurringId, {
      lastProcessedDate: new Date(),
      nextOccurrence,
    });

    // Check if should deactivate (if endDate reached)
    if (recurring.endDate && nextOccurrence >= new Date(recurring.endDate)) {
      await this.update(recurringId, { isActive: false });
    }

    return transactionId;
  }

  /**
   * Calculate next occurrence date based on frequency
   */
  private calculateNextOccurrence(recurring: RecurringTransaction): Date {
    const current = new Date(recurring.nextOccurrence);
    const next = new Date(current);

    switch (recurring.frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'QUARTERLY':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }

  /**
   * Deactivate a recurring transaction
   */
  async deactivate(recurringId: string): Promise<void> {
    await this.update(recurringId, {
      isActive: false,
      updatedAt: new Date(),
    });
  }

  /**
   * Reactivate a recurring transaction
   */
  async reactivate(recurringId: string): Promise<void> {
    const recurring = await this.getById(recurringId);
    if (!recurring) throw new Error('Recurring transaction not found');

    // Recalculate next occurrence from today
    const nextOccurrence = new Date();
    await this.update(recurringId, {
      isActive: true,
      nextOccurrence,
      updatedAt: new Date(),
    });
  }

  /**
   * Get upcoming recurring transactions (next N days)
   */
  async getUpcoming(daysAhead: number = 30): Promise<RecurringTransaction[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const active = await this.getActive();
    return active.filter((rt) => {
      const nextDate = new Date(rt.nextOccurrence);
      return nextDate >= today && nextDate <= futureDate;
    });
  }
}
