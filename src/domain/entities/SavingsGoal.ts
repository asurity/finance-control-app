/**
 * SavingsGoal Domain Entity
 * Pure business object with validation rules and domain logic
 */

import { SavingsGoalStatus } from '@/types/firestore';

export class SavingsGoal {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly targetAmount: number,
    public currentAmount: number, // Mutable - updated with contributions
    public readonly currency: string,
    public status: SavingsGoalStatus, // Mutable - can change state
    public readonly userId: string,
    public readonly createdAt: Date,
    public readonly description?: string,
    public readonly targetDate?: Date,
    public readonly icon?: string,
    public readonly color?: string,
    public readonly linkedAccountId?: string,
    public readonly updatedAt?: Date,
    public completedAt?: Date // Mutable - set when completed
  ) {
    this.validate();
  }

  /**
   * Validates savings goal business rules
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('Savings goal name is required');
    }

    if (this.name.length > 100) {
      throw new Error('Savings goal name cannot exceed 100 characters');
    }

    if (this.targetAmount <= 0) {
      throw new Error('Target amount must be greater than 0');
    }

    if (this.currentAmount < 0) {
      throw new Error('Current amount cannot be negative');
    }

    if (!this.currency || this.currency.trim().length === 0) {
      throw new Error('Currency is required');
    }

    if (!this.userId || this.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!(this.createdAt instanceof Date) || isNaN(this.createdAt.getTime())) {
      throw new Error('Invalid created date');
    }

    if (this.targetDate) {
      if (!(this.targetDate instanceof Date) || isNaN(this.targetDate.getTime())) {
        throw new Error('Invalid target date');
      }

      if (this.targetDate <= this.createdAt) {
        throw new Error('Target date must be after creation date');
      }
    }

    if (this.description && this.description.length > 500) {
      throw new Error('Description cannot exceed 500 characters');
    }
  }

  /**
   * Calculates progress percentage towards goal
   * @returns Progress percentage (0-100)
   */
  getProgressPercentage(): number {
    return Math.min((this.currentAmount / this.targetAmount) * 100, 100);
  }

  /**
   * Calculates remaining amount to reach goal
   * @returns Remaining amount (0 if completed)
   */
  getRemainingAmount(): number {
    return Math.max(this.targetAmount - this.currentAmount, 0);
  }

  /**
   * Checks if goal has been reached
   * @returns True if current amount >= target amount
   */
  isGoalReached(): boolean {
    return this.currentAmount >= this.targetAmount;
  }

  /**
   * Adds a contribution to the goal
   * @param amount Contribution amount
   * @throws Error if amount is invalid
   */
  addContribution(amount: number): void {
    if (amount <= 0) {
      throw new Error('Contribution amount must be greater than 0');
    }

    if (this.status === 'CANCELLED') {
      throw new Error('Cannot add contribution to a cancelled goal');
    }

    if (this.status === 'COMPLETED') {
      throw new Error('Cannot add contribution to a completed goal');
    }

    this.currentAmount += amount;

    // Auto-complete if target reached
    if (this.isGoalReached() && this.status === 'ACTIVE') {
      this.complete();
    }
  }

  /**
   * Marks the goal as completed
   * @throws Error if cannot be completed
   */
  complete(): void {
    if (this.status === 'COMPLETED') {
      throw new Error('Goal is already completed');
    }

    if (this.status === 'CANCELLED') {
      throw new Error('Cannot complete a cancelled goal');
    }

    if (!this.isGoalReached()) {
      throw new Error('Cannot complete goal: target amount not reached');
    }

    this.status = 'COMPLETED';
    this.completedAt = new Date();
  }

  /**
   * Cancels the goal
   * @throws Error if already cancelled or completed
   */
  cancel(): void {
    if (this.status === 'CANCELLED') {
      throw new Error('Goal is already cancelled');
    }

    if (this.status === 'COMPLETED') {
      throw new Error('Cannot cancel a completed goal');
    }

    this.status = 'CANCELLED';
  }

  /**
   * Reactivates a cancelled goal
   * @throws Error if not cancelled
   */
  reactivate(): void {
    if (this.status !== 'CANCELLED') {
      throw new Error('Can only reactivate cancelled goals');
    }

    this.status = 'ACTIVE';
  }

  /**
   * Checks if goal is active
   */
  isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  /**
   * Checks if goal is completed
   */
  isCompleted(): boolean {
    return this.status === 'COMPLETED';
  }

  /**
   * Checks if goal is cancelled
   */
  isCancelled(): boolean {
    return this.status === 'CANCELLED';
  }

  /**
   * Checks if goal has a target date
   */
  hasTargetDate(): boolean {
    return !!this.targetDate;
  }

  /**
   * Gets the number of days until target date
   * @param currentDate Date to check (defaults to now)
   * @returns Days remaining or undefined if no target date
   */
  getDaysUntilTarget(currentDate: Date = new Date()): number | undefined {
    if (!this.targetDate) {
      return undefined;
    }

    const diffTime = this.targetDate.getTime() - currentDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Checks if target date is approaching (within threshold days)
   * @param thresholdDays Days threshold (default: 30)
   * @returns True if within threshold
   */
  isTargetDateApproaching(thresholdDays: number = 30): boolean {
    const daysUntil = this.getDaysUntilTarget();
    return daysUntil !== undefined && daysUntil <= thresholdDays && daysUntil > 0;
  }

  /**
   * Checks if target date has passed
   * @param currentDate Date to check (defaults to now)
   * @returns True if past target date
   */
  isOverdue(currentDate: Date = new Date()): boolean {
    if (!this.targetDate) {
      return false;
    }

    return currentDate > this.targetDate && !this.isCompleted();
  }

  /**
   * Calculates required monthly savings to reach goal by target date
   * @param currentDate Date to check (defaults to now)
   * @returns Required monthly amount or undefined if no target date
   */
  getRequiredMonthlySavings(currentDate: Date = new Date()): number | undefined {
    if (!this.targetDate) {
      return undefined;
    }

    const remaining = this.getRemainingAmount();
    const daysRemaining = this.getDaysUntilTarget(currentDate);

    if (!daysRemaining || daysRemaining <= 0) {
      return undefined;
    }

    const monthsRemaining = daysRemaining / 30;
    return remaining / monthsRemaining;
  }

  /**
   * Checks if goal has a linked account
   */
  hasLinkedAccount(): boolean {
    return !!this.linkedAccountId && this.linkedAccountId.trim().length > 0;
  }
}
