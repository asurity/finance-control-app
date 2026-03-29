/**
 * Budget Domain Entity
 * Pure business object with validation rules and domain logic
 */

import { BudgetPeriod } from '@/types/firestore';

export class Budget {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly amount: number,
    public readonly period: BudgetPeriod,
    public readonly categoryId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {
    this.validate();
  }

  /**
   * Validates budget business rules
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Budget name is required');
    }

    if (this.name.length > 100) {
      throw new Error('Budget name cannot exceed 100 characters');
    }

    if (this.amount <= 0) {
      throw new Error('Budget amount must be greater than 0');
    }

    if (!this.categoryId || this.categoryId.trim().length === 0) {
      throw new Error('Category ID is required');
    }

    // Date validations
    if (!(this.startDate instanceof Date) || isNaN(this.startDate.getTime())) {
      throw new Error('Invalid start date');
    }

    if (!(this.endDate instanceof Date) || isNaN(this.endDate.getTime())) {
      throw new Error('Invalid end date');
    }

    if (this.endDate <= this.startDate) {
      throw new Error('End date must be after start date');
    }
  }

  /**
   * Calculates budget usage percentage
   * @param spent Amount already spent
   * @returns Usage percentage (0-100+)
   */
  calculateUsagePercentage(spent: number): number {
    if (spent < 0) {
      throw new Error('Spent amount cannot be negative');
    }

    return (spent / this.amount) * 100;
  }

  /**
   * Calculates remaining budget
   * @param spent Amount already spent
   * @returns Remaining amount (can be negative if exceeded)
   */
  calculateRemaining(spent: number): number {
    if (spent < 0) {
      throw new Error('Spent amount cannot be negative');
    }

    return this.amount - spent;
  }

  /**
   * Checks if budget is exceeded
   * @param spent Amount already spent
   * @returns True if spent amount exceeds budget
   */
  isExceeded(spent: number): boolean {
    return spent > this.amount;
  }

  /**
   * Checks if budget is approaching limit (>= threshold percentage)
   * @param spent Amount already spent
   * @param thresholdPercent Threshold percentage (default: 80)
   * @returns True if usage is at or above threshold
   */
  isApproachingLimit(spent: number, thresholdPercent: number = 80): boolean {
    const usage = this.calculateUsagePercentage(spent);
    return usage >= thresholdPercent;
  }

  /**
   * Checks if budget is currently active (within date range)
   * @param currentDate Date to check (defaults to now)
   * @returns True if current date is within budget period
   */
  isActive(currentDate: Date = new Date()): boolean {
    return currentDate >= this.startDate && currentDate <= this.endDate;
  }

  /**
   * Checks if budget has expired
   * @param currentDate Date to check (defaults to now)
   * @returns True if current date is after end date
   */
  isExpired(currentDate: Date = new Date()): boolean {
    return currentDate > this.endDate;
  }

  /**
   * Checks if budget hasn't started yet
   * @param currentDate Date to check (defaults to now)
   * @returns True if current date is before start date
   */
  isUpcoming(currentDate: Date = new Date()): boolean {
    return currentDate < this.startDate;
  }

  /**
   * Gets the number of days remaining in the budget period
   * @param currentDate Date to check (defaults to now)
   * @returns Number of days remaining (0 if expired, negative if upcoming)
   */
  getDaysRemaining(currentDate: Date = new Date()): number {
    const diffTime = this.endDate.getTime() - currentDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Checks if budget is weekly
   */
  isWeekly(): boolean {
    return this.period === 'WEEKLY';
  }

  /**
   * Checks if budget is monthly
   */
  isMonthly(): boolean {
    return this.period === 'MONTHLY';
  }

  /**
   * Checks if budget is quarterly
   */
  isQuarterly(): boolean {
    return this.period === 'QUARTERLY';
  }

  /**
   * Checks if budget is yearly
   */
  isYearly(): boolean {
    return this.period === 'YEARLY';
  }
}
