/**
 * CategoryBudget Domain Entity
 * Represents a category allocation within a budget period with percentage-based distribution
 */

export class CategoryBudget {
  constructor(
    public readonly id: string,
    public readonly budgetPeriodId: string,
    public readonly categoryId: string,
    public readonly percentage: number,
    public readonly allocatedAmount: number,
    public readonly spentAmount: number = 0,
    public readonly userId: string,
    public readonly organizationId: string | null = null,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date()
  ) {
    this.validate();
  }

  /**
   * Validates category budget business rules
   * @throws Error if validation fails
   */
  private validate(): void {
    if (!this.budgetPeriodId || this.budgetPeriodId.trim().length === 0) {
      throw new Error('Budget period ID is required');
    }

    if (!this.categoryId || this.categoryId.trim().length === 0) {
      throw new Error('Category ID is required');
    }

    if (!this.userId || this.userId.trim().length === 0) {
      throw new Error('User ID is required');
    }

    if (this.percentage < 0 || this.percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }

    if (this.allocatedAmount < 0) {
      throw new Error('Allocated amount cannot be negative');
    }

    if (this.spentAmount < 0) {
      throw new Error('Spent amount cannot be negative');
    }
  }

  /**
   * Calculates the allocated amount based on percentage and budget period total
   */
  static calculateAllocatedAmount(totalBudget: number, percentage: number): number {
    if (totalBudget < 0) {
      throw new Error('Total budget cannot be negative');
    }
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }
    return Math.round((totalBudget * percentage) / 100);
  }

  /**
   * Gets the remaining amount available in this category budget
   */
  getRemainingAmount(): number {
    return Math.max(0, this.allocatedAmount - this.spentAmount);
  }

  /**
   * Gets the usage percentage of the allocated amount
   */
  getUsagePercentage(): number {
    if (this.allocatedAmount === 0) return 0;
    return Math.round((this.spentAmount / this.allocatedAmount) * 100);
  }

  /**
   * Checks if the budget has been exceeded
   */
  isExceeded(): boolean {
    return this.spentAmount > this.allocatedAmount;
  }

  /**
   * Checks if the budget is approaching the limit (>= 80% used)
   */
  isApproachingLimit(threshold: number = 80): boolean {
    return this.getUsagePercentage() >= threshold;
  }

  /**
   * Gets the amount by which the budget has been exceeded (0 if not exceeded)
   */
  getExceededAmount(): number {
    return Math.max(0, this.spentAmount - this.allocatedAmount);
  }

  /**
   * Adds spending to this category budget
   */
  addSpending(amount: number): CategoryBudget {
    if (amount < 0) {
      throw new Error('Spending amount cannot be negative');
    }

    return new CategoryBudget(
      this.id,
      this.budgetPeriodId,
      this.categoryId,
      this.percentage,
      this.allocatedAmount,
      this.spentAmount + amount,
      this.userId,
      this.organizationId,
      this.createdAt,
      new Date() // updatedAt
    );
  }

  /**
   * Subtracts spending from this category budget (for transaction deletion/modification)
   */
  subtractSpending(amount: number): CategoryBudget {
    if (amount < 0) {
      throw new Error('Spending amount cannot be negative');
    }

    return new CategoryBudget(
      this.id,
      this.budgetPeriodId,
      this.categoryId,
      this.percentage,
      this.allocatedAmount,
      Math.max(0, this.spentAmount - amount),
      this.userId,
      this.organizationId,
      this.createdAt,
      new Date() // updatedAt
    );
  }

  /**
   * Updates the percentage and recalculates the allocated amount
   */
  updatePercentage(newPercentage: number, totalBudget: number): CategoryBudget {
    const newAllocatedAmount = CategoryBudget.calculateAllocatedAmount(totalBudget, newPercentage);

    return new CategoryBudget(
      this.id,
      this.budgetPeriodId,
      this.categoryId,
      newPercentage,
      newAllocatedAmount,
      this.spentAmount,
      this.userId,
      this.organizationId,
      this.createdAt,
      new Date() // updatedAt
    );
  }

  /**
   * Recalculates the allocated amount when budget period total changes
   */
  recalculateAllocatedAmount(newTotalBudget: number): CategoryBudget {
    const newAllocatedAmount = CategoryBudget.calculateAllocatedAmount(newTotalBudget, this.percentage);

    return new CategoryBudget(
      this.id,
      this.budgetPeriodId,
      this.categoryId,
      this.percentage,
      newAllocatedAmount,
      this.spentAmount,
      this.userId,
      this.organizationId,
      this.createdAt,
      new Date() // updatedAt
    );
  }

  /**
   * Converts the entity to a plain object for persistence
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      budgetPeriodId: this.budgetPeriodId,
      categoryId: this.categoryId,
      percentage: this.percentage,
      allocatedAmount: this.allocatedAmount,
      spentAmount: this.spentAmount,
      userId: this.userId,
      organizationId: this.organizationId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
