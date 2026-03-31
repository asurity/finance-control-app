/**
 * RecurringTransaction Domain Entity
 * Pure business object with validation rules and domain logic
 */

import { TransactionType, RecurrenceFrequency } from '@/types/firestore';

export class RecurringTransaction {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly amount: number,
    public readonly type: TransactionType,
    public readonly frequency: RecurrenceFrequency,
    public readonly accountId: string,
    public readonly categoryId: string,
    public readonly userId: string,
    public readonly startDate: Date,
    public nextOccurrence: Date, // Mutable - updated after processing
    public isActive: boolean, // Mutable - can be paused/resumed
    public readonly endDate?: Date,
    public lastProcessedDate?: Date, // Mutable - updated after processing
    public readonly tags?: string[],
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {
    this.validate();
  }

  /**
   * Validates recurring transaction business rules
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.description || this.description.trim().length === 0) {
      throw new Error('Recurring transaction description is required');
    }

    if (this.description.length > 200) {
      throw new Error('Description cannot exceed 200 characters');
    }

    if (this.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (!this.accountId || this.accountId.trim().length === 0) {
      throw new Error('Account ID is required');
    }

    if (!this.categoryId || this.categoryId.trim().length === 0) {
      throw new Error('Category ID is required');
    }

    if (!this.userId || this.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    // Date validations
    if (!(this.startDate instanceof Date) || isNaN(this.startDate.getTime())) {
      throw new Error('Invalid start date');
    }

    if (!(this.nextOccurrence instanceof Date) || isNaN(this.nextOccurrence.getTime())) {
      throw new Error('Invalid next occurrence date');
    }

    if (this.endDate) {
      if (!(this.endDate instanceof Date) || isNaN(this.endDate.getTime())) {
        throw new Error('Invalid end date');
      }

      if (this.endDate <= this.startDate) {
        throw new Error('End date must be after start date');
      }
    }
  }

  /**
   * Checks if recurring transaction is an expense
   */
  isExpense(): boolean {
    return this.type === 'EXPENSE';
  }

  /**
   * Checks if recurring transaction is an income
   */
  isIncome(): boolean {
    return this.type === 'INCOME';
  }

  /**
   * Checks if recurring transaction is due for processing
   * @param currentDate Date to check (defaults to now)
   * @returns True if should be processed
   */
  isDueForProcessing(currentDate: Date = new Date()): boolean {
    if (!this.isActive) {
      return false;
    }

    // Check if past end date
    if (this.endDate && currentDate > this.endDate) {
      return false;
    }

    // Check if next occurrence is today or in the past
    return currentDate >= this.nextOccurrence;
  }

  /**
   * Calculates the next occurrence date based on frequency
   * @param fromDate Starting date (defaults to current nextOccurrence)
   * @returns Next occurrence date
   */
  calculateNextOccurrence(fromDate?: Date): Date {
    const baseDate = fromDate || this.nextOccurrence;
    const next = new Date(baseDate);

    switch (this.frequency) {
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
      default:
        throw new Error(`Unknown frequency: ${this.frequency}`);
    }

    return next;
  }

  /**
   * Updates next occurrence after processing
   */
  updateNextOccurrence(): void {
    this.nextOccurrence = this.calculateNextOccurrence();
    this.lastProcessedDate = new Date();
  }

  /**
   * Pauses the recurring transaction
   */
  pause(): void {
    this.isActive = false;
  }

  /**
   * Resumes the recurring transaction
   */
  resume(): void {
    this.isActive = true;
  }

  /**
   * Checks if recurring transaction has ended
   * @param currentDate Date to check (defaults to now)
   * @returns True if past end date or inactive
   */
  hasEnded(currentDate: Date = new Date()): boolean {
    if (this.endDate && currentDate > this.endDate) {
      return true;
    }
    return !this.isActive;
  }

  /**
   * Checks if recurring transaction is indefinite (no end date)
   */
  isIndefinite(): boolean {
    return !this.endDate;
  }

  /**
   * Gets the number of occurrences remaining (if has end date)
   * @param currentDate Date to check (defaults to now)
   * @returns Number of occurrences or undefined if indefinite
   */
  getOccurrencesRemaining(currentDate: Date = new Date()): number | undefined {
    if (!this.endDate) {
      return undefined; // Indefinite
    }

    let count = 0;
    let date = new Date(this.nextOccurrence);

    while (date <= this.endDate) {
      if (date >= currentDate) {
        count++;
      }
      date = this.calculateNextOccurrence(date);
    }

    return count;
  }

  /**
   * Checks frequency type
   */
  isDaily(): boolean {
    return this.frequency === 'DAILY';
  }

  isWeekly(): boolean {
    return this.frequency === 'WEEKLY';
  }

  isBiweekly(): boolean {
    return this.frequency === 'BIWEEKLY';
  }

  isMonthly(): boolean {
    return this.frequency === 'MONTHLY';
  }

  isQuarterly(): boolean {
    return this.frequency === 'QUARTERLY';
  }

  isYearly(): boolean {
    return this.frequency === 'YEARLY';
  }
}
