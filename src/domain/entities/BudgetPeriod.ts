/**
 * BudgetPeriod Domain Entity
 * Represents a budget period with a fixed total amount distributed across categories by percentages
 */

export class BudgetPeriod {
  constructor(
    public readonly id: string,
    public readonly totalAmount: number,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly userId: string,
    public readonly organizationId: string | null = null,
    public readonly name?: string,
    public readonly description?: string,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
    public readonly version: number = 1
  ) {
    this.validate();
  }

  /**
   * Validates budget period business rules
   * @throws Error if validation fails
   */
  private validate(): void {
    if (this.totalAmount <= 0) {
      throw new Error('Budget period total amount must be greater than 0');
    }

    if (!this.userId || this.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (!(this.startDate instanceof Date) || isNaN(this.startDate.getTime())) {
      throw new Error('Start date must be a valid date');
    }

    if (!(this.endDate instanceof Date) || isNaN(this.endDate.getTime())) {
      throw new Error('End date must be a valid date');
    }

    if (this.startDate >= this.endDate) {
      throw new Error('End date must be after start date');
    }

    if (this.name && this.name.length > 100) {
      throw new Error('Name cannot exceed 100 characters');
    }

    if (this.description && this.description.length > 500) {
      throw new Error('Description cannot exceed 500 characters');
    }
  }

  /**
   * Checks if the budget period is currently active
   */
  isActive(): boolean {
    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
  }

  /**
   * Gets the duration of the budget period in days
   */
  getDurationInDays(): number {
    const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Gets the remaining days in the budget period
   */
  getRemainingDays(): number {
    const now = new Date();
    if (now > this.endDate) return 0;
    if (now < this.startDate) return this.getDurationInDays();

    const diffTime = Math.abs(this.endDate.getTime() - now.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Checks if the budget period has expired
   */
  hasExpired(): boolean {
    return new Date() > this.endDate;
  }

  /**
   * Checks if the budget period is upcoming (not started yet)
   */
  isUpcoming(): boolean {
    return new Date() < this.startDate;
  }

  /**
   * Gets the progress percentage of the budget period (time-based)
   */
  getTimeProgressPercentage(): number {
    const now = new Date();
    if (now < this.startDate) return 0;
    if (now > this.endDate) return 100;

    const totalDuration = this.endDate.getTime() - this.startDate.getTime();
    const elapsed = now.getTime() - this.startDate.getTime();

    return Math.round((elapsed / totalDuration) * 100);
  }

  /**
   * Creates a copy of the budget period with updated values
   */
  update(updates: {
    totalAmount?: number;
    startDate?: Date;
    endDate?: Date;
    name?: string;
    description?: string;
  }): BudgetPeriod {
    return new BudgetPeriod(
      this.id,
      updates.totalAmount ?? this.totalAmount,
      updates.startDate ?? this.startDate,
      updates.endDate ?? this.endDate,
      this.userId,
      this.organizationId,
      updates.name ?? this.name,
      updates.description ?? this.description,
      this.createdAt,
      new Date(), // updatedAt
      this.version // preserve version for optimistic locking
    );
  }

  /**
   * Converts the entity to a plain object for persistence
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      totalAmount: this.totalAmount,
      startDate: this.startDate,
      endDate: this.endDate,
      userId: this.userId,
      organizationId: this.organizationId,
      name: this.name,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
