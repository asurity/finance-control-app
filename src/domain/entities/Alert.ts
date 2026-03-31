/**
 * Alert Domain Entity
 * Pure business object with validation rules and domain logic
 */

import { AlertType, AlertPriority } from '@/types/firestore';

type RelatedEntityType = 'budget' | 'account' | 'transaction' | 'creditCard' | 'savingsGoal';

export class Alert {
  constructor(
    public readonly id: string,
    public readonly type: AlertType,
    public readonly priority: AlertPriority,
    public readonly title: string,
    public readonly message: string,
    public isRead: boolean, // Mutable - can be marked as read
    public isArchived: boolean, // Mutable - can be archived
    public readonly userId: string,
    public readonly createdAt: Date,
    public readonly relatedEntityType?: RelatedEntityType,
    public readonly relatedEntityId?: string,
    public readonly thresholdPercent?: number,
    public readAt?: Date, // Mutable - set when marked as read
    public archivedAt?: Date // Mutable - set when archived
  ) {
    this.validate();
  }

  /**
   * Validates alert business rules
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('Alert title is required');
    }

    if (this.title.length > 100) {
      throw new Error('Alert title cannot exceed 100 characters');
    }

    if (!this.message || this.message.trim().length === 0) {
      throw new Error('Alert message is required');
    }

    if (this.message.length > 500) {
      throw new Error('Alert message cannot exceed 500 characters');
    }

    if (!this.userId || this.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!(this.createdAt instanceof Date) || isNaN(this.createdAt.getTime())) {
      throw new Error('Invalid created date');
    }

    // Threshold validation
    if (this.thresholdPercent !== undefined) {
      if (this.thresholdPercent < 0 || this.thresholdPercent > 100) {
        throw new Error('Threshold percent must be between 0 and 100');
      }
    }
  }

  /**
   * Marks the alert as read
   */
  markAsRead(): void {
    if (!this.isRead) {
      this.isRead = true;
      this.readAt = new Date();
    }
  }

  /**
   * Marks the alert as unread
   */
  markAsUnread(): void {
    this.isRead = false;
    this.readAt = undefined;
  }

  /**
   * Archives the alert
   */
  archive(): void {
    if (!this.isArchived) {
      this.isArchived = true;
      this.archivedAt = new Date();
    }
  }

  /**
   * Unarchives the alert
   */
  unarchive(): void {
    this.isArchived = false;
    this.archivedAt = undefined;
  }

  /**
   * Checks if alert is unread
   */
  isUnread(): boolean {
    return !this.isRead;
  }

  /**
   * Checks if alert is urgent priority
   */
  isUrgent(): boolean {
    return this.priority === 'URGENT';
  }

  /**
   * Checks if alert is high priority
   */
  isHighPriority(): boolean {
    return this.priority === 'HIGH';
  }

  /**
   * Checks if alert is medium priority
   */
  isMediumPriority(): boolean {
    return this.priority === 'MEDIUM';
  }

  /**
   * Checks if alert is low priority
   */
  isLowPriority(): boolean {
    return this.priority === 'LOW';
  }

  /**
   * Gets the age of the alert in days
   */
  getAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Checks if alert is old (> 30 days)
   */
  isOld(): boolean {
    return this.getAgeInDays() > 30;
  }

  /**
   * Checks alert type
   */
  isBudgetThresholdAlert(): boolean {
    return this.type === 'BUDGET_THRESHOLD';
  }

  isPaymentDueAlert(): boolean {
    return this.type === 'PAYMENT_DUE';
  }

  isLowBalanceAlert(): boolean {
    return this.type === 'LOW_BALANCE';
  }

  isUnusualExpenseAlert(): boolean {
    return this.type === 'UNUSUAL_EXPENSE';
  }

  isSavingsGoalAlert(): boolean {
    return this.type === 'SAVINGS_GOAL';
  }

  isCreditLimitAlert(): boolean {
    return this.type === 'CREDIT_LIMIT';
  }

  isRecurringFailedAlert(): boolean {
    return this.type === 'RECURRING_FAILED';
  }

  /**
   * Checks if alert has a related entity
   */
  hasRelatedEntity(): boolean {
    return !!this.relatedEntityType && !!this.relatedEntityId;
  }

  /**
   * Gets the time since read (if read)
   */
  getTimeSinceRead(): number | undefined {
    if (!this.readAt) {
      return undefined;
    }

    const now = new Date();
    return now.getTime() - this.readAt.getTime();
  }

  /**
   * Gets the time since archived (if archived)
   */
  getTimeSinceArchived(): number | undefined {
    if (!this.archivedAt) {
      return undefined;
    }

    const now = new Date();
    return now.getTime() - this.archivedAt.getTime();
  }
}
